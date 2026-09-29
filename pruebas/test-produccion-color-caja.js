// El color elegido de cada producto y la caja predeterminada de la unidad
// (29/09/2026): productos_terminados.color con cambiar_color_producto, y
// cambiar_caja_predeterminada. Se EJECUTA la configuración de la gestión con
// los datos de la maqueta y una base falsa, y la planta con su sandbox:
//  - el detalle del producto tiene "Automático" + los diez colores del CHECK;
//    tocar uno llama a cambiar_color_producto y, si la base rechaza, el color
//    vuelve y el error va pegado;
//  - un producto con color elegido se pinta con ese color en la gestión Y en
//    la planta (las dos tablas dicen lo mismo); con null, sale del nombre;
//  - la caja predeterminada se elige en un select (cajas activas + Ninguna) y
//    se guarda con cambiar_caja_predeterminada; si falla, vuelve la de antes.
//
//   node pruebas/test-produccion-color-caja.js
//   ARCHIVO_TEST=<copia de modulos/produccion-gestion.html>  ARCHIVO_PLANTA=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')
const DATOS = require('./datos-maqueta/config-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
const PLANTA = process.env.ARCHIVO_PLANTA || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const FUENTE_PLANTA = leer(PLANTA)
const { chk, esperas, fin } = arnes()

const copia = (x) => JSON.parse(JSON.stringify(x))
function tablaFiltrada(filas) {
  return (filtros) => {
    let r = filas
    for (const f of filtros) {
      if (f[0] === 'eq') r = r.filter(x => !(f[1] in x) || x[f[1]] === f[2])
      if (f[0] === 'in') r = r.filter(x => !(f[1] in x) || f[2].includes(x[f[1]]))
    }
    return { data: copia(r), error: null }
  }
}
// `rechazar`: las rpc que contestan con error (el mensaje de la base).
function armar({ rechazar = {}, productos = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map([['configurar', { unidades: ['u-n', 'u-d'] }], ['ver', { unidades: ['u-n', 'u-d'] }]])
  S.estado.unidades = new Map([['u-n', 'Cucuruchos Nuss'], ['u-d', 'Dolce Pasta']])
  S.estado.unidadId = 'u-n'
  S.estado.conosPendientes = 0
  const tablas = { ...DATOS.tablas, ...(productos ? { productos_terminados: productos } : {}) }
  for (const [t, filas] of Object.entries(tablas)) S.__tablas[t] = tablaFiltrada(filas)
  S.__setRpc(async (n) => n in rechazar ? { data: null, error: { message: rechazar[n] } } : (n in DATOS.rpc ? { data: copia(DATOS.rpc[n]), error: null } : { data: null, error: null }))
  return S
}
const rpcsDe = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n).map(([, p]) => p)
const cuerpo = (S) => S.__doc.getElementById('pr-config-cuerpo').innerHTML
const CHECK = ['amarillo', 'verde', 'durazno', 'violeta', 'marron', 'marron_claro', 'rosa', 'celeste_gris', 'oliva', 'terracota']

esperas.push((async () => {
  // ── Las tablas de colores ─────────────────────────────────────────────
  const G = armar()
  chk('los colores elegibles son EXACTAMENTE los diez del CHECK de la base', JSON.stringify(Object.keys(G.COLORES_ELEGIBLES)) === JSON.stringify(CHECK), Object.keys(G.COLORES_ELEGIBLES).join())
  const P = construirProduccion(PLANTA)
  chk('la planta tiene la MISMA tabla de colores que la gestión', JSON.stringify(P.COLORES_ELEGIBLES) === JSON.stringify(G.COLORES_ELEGIBLES))
  chk('los selects de productos traen la columna color (gestión)', (FUENTE.match(/from\('productos_terminados'\)\.select\('id, nombre, tipo_masa, activo, orden, categoria, color'\)/g) || []).length === 2)
  chk('el catálogo de la planta trae la columna color', /\.select\('id, nombre, tipo_masa, orden, color'\)\.eq\('unidad_negocio_id', unidadId\)\.eq\('activo', true\)/.test(FUENTE_PLANTA))

  // ── El color, en la gestión y en la planta ────────────────────────────
  const grande = { nombre: 'Cucuruchón Grande', tipo_masa: 'Común' }
  chk('sin color elegido, sale del nombre (Grande: durazno del nombre)', G.colorDeProducto({ ...grande, color: null }).c === 'oklch(0.68 0.16 50)')
  chk('con color elegido, manda el elegido (gestión)', G.colorDeProducto({ ...grande, color: 'violeta' }).c === 'oklch(0.52 0.15 300)')
  chk('un color que no es de la lista se ignora (sale del nombre)', G.colorDeProducto({ ...grande, color: '<b>' }).c === 'oklch(0.68 0.16 50)')
  const pl = P.colorProducto({ ...grande, color: 'violeta' })
  chk('con color elegido, manda el elegido (planta)', pl.c === 'oklch(0.52 0.15 300)' && pl.choco === false)
  chk('la planta usa la misma fórmula que la gestión para el tono', JSON.stringify({ c: pl.c, dk: pl.dk, t: pl.t }) === JSON.stringify(G.colorDeProducto({ ...grande, color: 'violeta' })))
  chk('un chocolate con color elegido también lo toma (y sigue marcado chocolate)', P.colorProducto({ nombre: 'Mini Chocolate', tipo_masa: 'Chocolate', color: 'rosa' }).c === 'oklch(0.66 0.13 350)' && P.colorProducto({ nombre: 'Mini Chocolate', tipo_masa: 'Chocolate', color: 'rosa' }).choco === true)
  chk('en la planta, sin color sale del nombre como antes', P.colorProducto({ ...grande, color: null }).c === P.colorProducto(grande).c)

  // ── El selector de color en el detalle del producto ───────────────────
  const S = armar()
  await S.mostrarConfig('productos')
  const c = S.estado.config
  S.elegirEnLista('p-grande')
  let h = cuerpo(S)
  chk('el detalle tiene "Automático" y los diez colores', /data-prod-color="p-grande\|"/.test(h) && CHECK.every(k => h.includes(`data-prod-color="p-grande|${k}"`)))
  chk('sin color elegido, "Automático" está marcado', /data-prod-color="p-grande\|" aria-pressed="true"/.test(h) && /Automático: sale del nombre/.test(h))
  await S.cambiarColorProducto('p-grande', 'oliva')
  chk('tocar un color llama a cambiar_color_producto con el producto y el color', JSON.stringify(rpcsDe(S, 'cambiar_color_producto').pop()) === JSON.stringify({ p_producto_id: 'p-grande', p_color: 'oliva' }))
  h = cuerpo(S)
  chk('queda marcado el elegido y el producto se pinta con él', /data-prod-color="p-grande\|oliva" aria-pressed="true"/.test(h) && c.datos.productos.find(p => p.id === 'p-grande').color === 'oliva' && h.includes('oklch(0.58 0.1 120)'))
  await S.cambiarColorProducto('p-grande', null)
  chk('"Automático" manda p_color null', rpcsDe(S, 'cambiar_color_producto').pop()?.p_color === null && c.datos.productos.find(p => p.id === 'p-grande').color === null)
  const n = rpcsDe(S, 'cambiar_color_producto').length
  await S.cambiarColorProducto('p-grande', null)
  chk('tocar el que ya está no llama a la base', rpcsDe(S, 'cambiar_color_producto').length === n)
  chk('el click del color llega a cambiarColorProducto', /if \(ds\.prodColor !== undefined\) \{ const \[id, valor\] = ds\.prodColor\.split\('\|'\); cambiarColorProducto\(id, valor \|\| null\); return \}/.test(FUENTE))

  // Si la base rechaza: vuelve el de antes y el error va pegado.
  const E = armar({ rechazar: { cambiar_color_producto: 'No tenés permiso para configurar producción en esta fábrica.' } })
  await E.mostrarConfig('productos')
  E.elegirEnLista('p-grande')
  const ok = await E.cambiarColorProducto('p-grande', 'rosa')
  const he = cuerpo(E)
  chk('si la base rechaza, el color vuelve al de antes', ok === false && E.estado.config.datos.productos.find(p => p.id === 'p-grande').color == null)
  chk('y el error de la base va pegado al selector, tal cual', /No tenés permiso para configurar producción en esta fábrica\./.test(he) && E.estado.config.error?.donde === 'pr-cfg-prod-color')

  // ── La caja predeterminada ────────────────────────────────────────────
  const K = armar()
  await K.mostrarConfig('productos')
  let hk = cuerpo(K)
  chk('ya no dice "Cambiar · pronto"', !/pronto/i.test(hk))
  chk('un select con Ninguna y las cajas activas, con la actual elegida', /<select[^>]*id="pr-cfg-cajap" data-caja-pred="1"/.test(hk) && /<option value="">Ninguna<\/option>/.test(hk) &&
    /<option value="i-caja1" selected>/.test(hk) && /<option value="i-caja2">/.test(hk))
  chk('solo cajas: ningún otro insumo en el select', !/<select[^>]*data-caja-pred[\s\S]*?value="i-harina/.test(hk.slice(hk.indexOf('data-caja-pred'), hk.indexOf('</select>', hk.indexOf('data-caja-pred')))))
  await K.cambiarCajaPredeterminada('i-caja2')
  chk('elegir otra llama a cambiar_caja_predeterminada con la unidad y la caja', JSON.stringify(rpcsDe(K, 'cambiar_caja_predeterminada').pop()) === JSON.stringify({ p_unidad_negocio_id: 'u-n', p_insumo_id: 'i-caja2' }))
  chk('queda elegida', K.estado.config.datos.cajaPredeterminada === 'i-caja2' && /<option value="i-caja2" selected>/.test(cuerpo(K)))
  await K.cambiarCajaPredeterminada('')
  chk('"Ninguna" manda p_insumo_id null', rpcsDe(K, 'cambiar_caja_predeterminada').pop()?.p_insumo_id === null && K.estado.config.datos.cajaPredeterminada === null)
  chk('el cambio del select llega a cambiarCajaPredeterminada', /if \(t\.dataset\?\.cajaPred !== undefined\) return cambiarCajaPredeterminada\(t\.value\)/.test(FUENTE))
  const KE = armar({ rechazar: { cambiar_caja_predeterminada: 'Eso no es una caja.' } })
  await KE.mostrarConfig('productos')
  const okk = await KE.cambiarCajaPredeterminada('i-caja3')
  chk('si la base rechaza, vuelve la de antes y el error va pegado', okk === false && KE.estado.config.datos.cajaPredeterminada === 'i-caja1' &&
    /Eso no es una caja\./.test(cuerpo(KE)) && KE.estado.config.error?.donde === 'pr-cfg-cajap')
  // Si no se pudo leer, no se ofrece cambiarla.
  KE.estado.config.datos.cajaPredeterminada = undefined
  chk('si no se pudo leer, no se ofrece el select', !/data-caja-pred/.test(KE.htmlCajaPredeterminada(KE.estado.config)) && /no se pudo leer/.test(KE.htmlCajaPredeterminada(KE.estado.config)))
})())
fin()
