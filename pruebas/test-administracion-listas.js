// ADMINISTRACIÓN — Listas de precios (26/09/2026), con retiros:precios.
//
// Las listas de la empresa y su grilla con el precio que rige hoy. Editar
// pide desde qué fecha rigen (hoy por defecto) y guarda una VERSIÓN nueva
// (guardar_precios): un precio nunca se pisa. Historial por producto. "Aumentar
// todo un X%" calcula en pantalla y guarda recién al confirmar.
//
//   node pruebas/test-administracion-listas.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const CAT = {
  productos: [
    { id: 'p2', nombre: 'Cucurucho choco', tipo_masa: 'Chocolate' },
    { id: 'p1', nombre: 'Cucurucho grande', tipo_masa: 'Común' },
  ],
  presentaciones: [
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', activa: true },
    { id: 'pr1c', producto_id: 'p1', nombre: 'Caja x 100 con cono', activa: true },
    { id: 'prv', producto_id: 'p1', nombre: 'Vieja', activa: false },
    { id: 'pr2', producto_id: 'p2', nombre: 'Caja x 50', activa: true },
  ],
  marcas: [],
}
const HOY_LEJOS = '2030-01-01'
const PRECIOS = [
  { presentacion_id: 'pr1', precio_caja: 2800, vigente_desde: '2026-08-01', cargado_en: '2026-08-01T10:00:00Z' },
  { presentacion_id: 'pr1', precio_caja: 3000, vigente_desde: '2026-09-01', cargado_en: '2026-09-01T10:00:00Z' },
  { presentacion_id: 'pr1', precio_caja: 3500, vigente_desde: '2099-01-01', cargado_en: '2026-09-20T10:00:00Z' },
  { presentacion_id: 'pr2', precio_caja: 5500, vigente_desde: '2026-09-01', cargado_en: '2026-09-01T10:00:00Z' },
]

function preparar(S) {
  S.estado.clientes = []
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.listas_precios = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true }, { id: 'l2', nombre: 'Viejos', moneda: 'USD', activa: false }]
  S.__tablas.lista_precios_items = PRECIOS
}

// ── Permisos ───────────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('con retiros:precios se ve la sección Listas', S.seccionesVisibles().some(s => s.id === 'listas'))
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  chk('solo con ver NO', !S.seccionesVisibles().some(s => s.id === 'listas'))
  esperas.push(S.abrirLista('l1').then(() => chk('y la lista no se abre', S.estado.lista === null)))
}

// ── Las listas ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.mostrarListas().then(() => {
    const h = S.__els.get('ad-listas-lista').innerHTML
    chk('lista las listas de la empresa', /data-lista="l1"/.test(h) && /Mayoristas/.test(h) && /data-lista="l2"/.test(h))
    chk('dice la moneda y si está inactiva', /En pesos/.test(h) && /En dólares · inactiva/.test(h) && />Inactiva</.test(h))
    chk('las lee de la empresa elegida', S.__llamadas.consultas.some(c => c[0] === 'listas_precios' && c[1].some(f => f[1] === 'unidad_negocio_id' && f[2] === 'u-n')))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.abrirListaNueva()
  S.__els.get('ad-lista-nombre').value = '  '
  esperas.push(S.guardarListaNueva().then(async () => {
    chk('una lista sin nombre no se crea', !S.__llamadas.rpc.some(x => x[0] === 'guardar_lista_precios') && /nombre/.test(S.estado.listaNueva.error))
    S.__els.get('ad-lista-nombre').value = ' Minoristas '
    S.__els.get('ad-lista-moneda').value = 'USD'
    S.__setRpc(async (n) => n === 'guardar_lista_precios' ? { data: 'l9', error: null } : { data: null, error: null })
    await S.guardarListaNueva()
    const p = S.__llamadas.rpc.find(x => x[0] === 'guardar_lista_precios')?.[1]
    chk('crear la lista con guardar_lista_precios', p && p.p_id === null && p.p_unidad_negocio_id === 'u-n' && p.p_nombre === 'Minoristas' && p.p_moneda === 'USD' && p.p_activa === true)
    chk('y se abre', S.estado.vista === 'ad-vista-lista' && S.estado.lista?.id === 'l9')
  }))
}

// ── El precio vigente y la grilla ──────────────────────────────────────────
{
  const S = nuevo()
  const { vigente, proximo } = S.vigenteYProximo(PRECIOS, 'pr1', '2026-09-26')
  chk('rige el de fecha más nueva que no sea posterior a hoy', vigente.precio_caja === 3000)
  chk('y se conoce el próximo ya cargado', proximo.precio_caja === 3500)
  chk('antes del 01/09 regía el de agosto', S.vigenteYProximo(PRECIOS, 'pr1', '2026-08-15').vigente.precio_caja === 2800)
  chk('sin precio: null (no 0)', S.vigenteYProximo(PRECIOS, 'pr1c', '2026-09-26').vigente === null)
  const filas = S.filasGrilla(CAT)
  chk('la grilla tiene las presentaciones activas', filas.map(f => f.presentacionId).join() === 'pr1,pr1c,pr2')
  chk('los de chocolate al final', filas[filas.length - 1].chocolate === true && filas[0].chocolate === false)
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(() => {
    const h = S.__els.get('ad-lista-grilla').innerHTML
    chk('la grilla muestra el precio vigente con su fecha', /\$ 3\.000,00 desde 01\/09\/2026/.test(h))
    chk('y el próximo', /próximo \$ 3\.500,00 desde 01\/01\/2099/.test(h))
    chk('una presentación sin precio lo dice', /Sin precio/.test(h))
    chk('el separador de chocolate', /ad-separador-grilla">Chocolate</.test(h))
    chk('"desde" viene en hoy', S.__els.get('ad-lista-desde').value === S.hoyArgentina())
    chk('sin cambios no hay nada que guardar', S.__els.get('ad-lista-pendientes').textContent === 'Sin precios nuevos.')
  }))
}

// ── Editar: una versión nueva, desde una fecha ─────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(async () => {
    const l = S.estado.lista
    S.cambiarPrecioLista('pr1c', 4200)
    S.cambiarPrecioLista('pr1', 3000)
    chk('un precio igual al que rige no cuenta como nuevo', JSON.stringify(S.preciosAGuardar(l, S.hoyArgentina())) === JSON.stringify([{ presentacion_id: 'pr1c', precio_caja: 4200 }]))
    chk('la fila editada se marca', /ad-precio ad-precio--pendiente" data-fila-precio="pr1c"/.test(S.htmlGrilla(l, S.hoyArgentina())))
    S.cambiarPrecioLista('pr1c', null)
    chk('borrar el campo lo saca de lo pendiente', S.preciosAGuardar(l, S.hoyArgentina()).length === 0)
    S.cambiarPrecioLista('pr1c', 4200)
    S.__els.get('ad-lista-desde').value = '2026-10-01'
    S.pedirGuardarPrecios()
    chk('guardar pide CONFIRMAR antes de mandar', !!l.confirmar && !S.__llamadas.rpc.some(x => x[0] === 'guardar_precios'))
    chk('y dice cuántos y desde cuándo', /Vas a guardar 1 precio nuevo que rigen desde el 01\/10\/2026/.test(S.__els.get('ad-confirmar-precios-texto').textContent))
    let p = null
    S.__setRpc(async (n, q) => { if (n === 'guardar_precios') p = q; return { data: { precios: 1 }, error: null } })
    await S.confirmarGuardarPrecios()
    chk('guardar_precios con la lista, la fecha y SOLO lo nuevo', p && p.p_lista_id === 'l1' && p.p_vigente_desde === '2026-10-01' && JSON.stringify(p.p_items) === JSON.stringify([{ presentacion_id: 'pr1c', precio_caja: 4200 }]))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(async () => {
    const l = S.estado.lista
    S.pedirGuardarPrecios()
    chk('sin precios nuevos no se pide confirmar', !l.confirmar && /No hay precios nuevos/.test(l.errorPorcentaje))
    S.cambiarPrecioLista('pr1', 3100)
    S.__els.get('ad-lista-desde').value = ''
    S.pedirGuardarPrecios()
    chk('sin fecha no se guarda', !l.confirmar && /desde qué fecha/.test(l.errorPorcentaje))
    S.__els.get('ad-lista-desde').value = '2026-01-01'
    S.pintarLista(false)
    chk('una fecha pasada se avisa', S.__els.get('ad-lista-desde-aviso').hidden === false && /fecha pasada/.test(S.__els.get('ad-lista-desde-aviso').textContent))
    S.pedirGuardarPrecios()
    S.__setRpc(async () => ({ data: null, error: { message: 'Un producto no es de esta unidad.' } }))
    await S.confirmarGuardarPrecios()
    chk('el error de la base va tal cual', l.confirmar?.error === 'Un producto no es de esta unidad.')
  }))
}

// ── Aumentar todo un X%: calcula y NO guarda hasta confirmar ────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(async () => {
    const l = S.estado.lista
    S.ponerNumero(S.__els.get('ad-lista-porcentaje'), 10)
    S.aplicarAumento()
    chk('calcula sobre el precio que rige hoy, redondeado a centavos', l.pendientes.get('pr1') === 3300 && l.pendientes.get('pr2') === 6050)
    chk('no inventa precio donde no había', !l.pendientes.has('pr1c'))
    chk('y NO guardó nada', !S.__llamadas.rpc.some(x => x[0] === 'guardar_precios'))
    chk('dice cuántos quedan sin guardar', S.__els.get('ad-lista-pendientes').textContent === '2 precios nuevos sin guardar.')
    S.descartarCambios()
    chk('descartar vuelve todo atrás', l.pendientes.size === 0)
    S.ponerNumero(S.__els.get('ad-lista-porcentaje'), 12.5)
    S.aplicarAumento()
    chk('12,5% sobre 5.500 = 6.187,50', l.pendientes.get('pr2') === 6187.5)
    S.ponerNumero(S.__els.get('ad-lista-porcentaje'), null)
    S.aplicarAumento()
    chk('sin porcentaje lo dice', /porcentaje/.test(l.errorPorcentaje))
    S.ponerNumero(S.__els.get('ad-lista-porcentaje'), -100)
    S.aplicarAumento()
    chk('-100% no se acepta', /-100/.test(l.errorPorcentaje))
    S.ponerNumero(S.__els.get('ad-lista-porcentaje'), 12.5)
    S.aplicarAumento()
    S.pedirGuardarPrecios()
    chk('guardar el aumento también pide confirmar', !!l.confirmar && !S.__llamadas.rpc.some(x => x[0] === 'guardar_precios'))
    let p = null
    S.__setRpc(async (n, q) => { if (n === 'guardar_precios') p = q; return { data: { precios: 2 }, error: null } })
    await S.confirmarGuardarPrecios()
    chk('recién al confirmar, guardar_precios con los dos', p && p.p_items.length === 2 && p.p_items.some(x => x.presentacion_id === 'pr2' && x.precio_caja === 6187.5))
  }))
  chk('el aumento acepta negativos (una rebaja) en el campo', /enlazarCampoNumero\(el, \{ decimales: 2, negativos: true \}\)/.test(src))
}

// ── Historial por producto ─────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(() => {
    const l = S.estado.lista
    const h = S.htmlHistorial(l, 'pr1', '2026-09-26')
    chk('el historial lista todas las versiones, la más nueva primero', h.indexOf('01/01/2099') < h.indexOf('01/09/2026') && h.indexOf('01/09/2026') < h.indexOf('01/08/2026'))
    chk('marca la que rige hoy y la que todavía no', /Desde 01\/09\/2026 · rige hoy/.test(h) && /Desde 01\/01\/2099 · todavía no rige/.test(h))
    chk('con sus precios', /\$ 2\.800,00/.test(h) && /\$ 3\.500,00/.test(h))
  }))
}

// ── Activar y desactivar ───────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(async () => {
    chk('una lista activa ofrece Desactivar', S.__els.get('ad-btn-lista-activa').textContent === 'Desactivar')
    let p = null
    S.__setRpc(async (n, q) => { if (n === 'guardar_lista_precios') p = q; return { data: 'l1', error: null } })
    await S.cambiarActivaLista()
    chk('desactivar con guardar_lista_precios conservando nombre y moneda', p && p.p_id === 'l1' && p.p_nombre === 'Mayoristas' && p.p_moneda === 'ARS' && p.p_activa === false)
  }))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.listas = { unidad: 'u-n', filas: [{ id: 'l1', nombre: marca('lista'), moneda: 'ARS', activa: false }] }
  chequearMarcas(chk, 'fila de lista', S.htmlFilaLista(S.estado.listas.filas[0]), ['lista'])
  const l = { id: 'l1', precios: [{ presentacion_id: 'x', precio_caja: 1, vigente_desde: '2026-01-01' }], filas: [{ presentacionId: 'x', producto: marca('producto'), presentacion: marca('presentacion'), chocolate: false }], pendientes: new Map() }
  chequearMarcas(chk, 'grilla', S.htmlGrilla(l, '2026-09-26'), ['producto', 'presentacion'])
  chequearMarcas(chk, 'historial', S.htmlHistorial(l, 'x', '2026-09-26'), ['producto', 'presentacion'])
  chequearMarcas(chk, 'error de la grilla', S.htmlGrilla({ ...l, error: marca('error') }, '2026-09-26'), ['error'])
}

fin()
