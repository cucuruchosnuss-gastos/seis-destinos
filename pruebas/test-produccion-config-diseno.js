// El diseño "Producción · Configuración" (29/09/2026) en la gestión de
// Producción: el color de cada producto (sale del NOMBRE: la base no tiene
// columna de color), la línea del empaque, las burbujas de lo que falta, la
// lista | detalle (buscar, elegir, volver), el editor de empaque que pregunta
// antes de soltar cambios, los interruptores que se guardan al tocarlos y
// vuelven si la base rechaza, "Volver a una versión" (crea una versión NUEVA
// con los ingredientes de esa), conectar y quitar insumos, los filtros y el
// resaltado de Conos, y el escape de todo texto de la base.
//
// Corre con los MISMOS datos de la maqueta del diseño
// (pruebas/datos-maqueta/config-produccion.js), filtrados por unidad.
//
//   node pruebas/test-produccion-config-diseno.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')
const DATOS = require('./datos-maqueta/config-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const copia = (x) => JSON.parse(JSON.stringify(x))

// Una tabla de la maqueta como la devolvería la base: aplica eq / in.
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

function armar(tablas = DATOS.tablas, rpcs = DATOS.rpc) {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map([['configurar', { unidades: ['u-n', 'u-d'] }], ['ver', { unidades: ['u-n', 'u-d'] }]])
  S.estado.unidades = new Map([['u-n', 'Cucuruchos Nuss'], ['u-d', 'Dolce Pasta']])
  S.estado.unidadId = 'u-n'
  S.estado.conosPendientes = 2
  for (const [t, filas] of Object.entries(tablas)) S.__tablas[t] = tablaFiltrada(filas)
  S.__setRpc(async (n) => n in rpcs ? { data: copia(rpcs[n]), error: null } : { data: null, error: null })
  return S
}
const rpcsDe = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n).map(([, p]) => p)
const cuerpo = (S) => S.__doc.getElementById('pr-config-cuerpo').innerHTML

// El diseño cambió la PANTALLA, no lo que se manda a la base: los armadores
// de parámetros de las RPCs tienen que seguir IGUALES a los de antes del
// diseño. El "antes" es un commit FIJO (e33da8c, la Parte 1 del sistema
// visual), nunca HEAD: con HEAD la comparación dejaría de medir al commitear.
const BASE = 'e33da8c'
function contratoIgual() {
  const { execSync } = require('child_process')
  const { extraerFn } = require('./extraer')
  const fs = require('fs')
  const antes = execSync(`git show ${BASE}:modulos/produccion-gestion.html`, { cwd: path.join(__dirname, '..'), maxBuffer: 1e8 }).toString()
  const ahora = fs.readFileSync(ARCHIVO, 'utf8')
  for (const n of ['parametrosGuardarProducto', 'parametrosGuardarPresentacion', 'parametrosGuardarEmpaque', 'parametrosGuardarMaquina',
    'parametrosGuardarIngrediente', 'parametrosRevisarMarca', 'ordenTrasMover', 'guardarEnConfig', 'guardarCambiosPersonal']) {
    chk(`${n}: igual que en ${BASE} (lo que viaja a la base no cambió)`, extraerFn(antes, n) === extraerFn(ahora, n))
  }
}

async function main() {
  contratoIgual()
  // ── El color de cada producto ─────────────────────────────────────────
  const C = armar()
  const clave = (nombre, extra = {}) => C.claveColorProducto({ nombre, tipo_masa: 'Común', ...extra })
  chk('Mini, Chico, Grande y Standard por su tamaño', clave('Cucuruchón Mini') === 'mini' && clave('Cucuruchón Chico') === 'chico' &&
    clave('Cucuruchón Grande') === 'grande' && clave('Cucuruchón Standard') === 'standard')
  chk('Grande es naranja durazno (0.68 0.16 50), no el naranja de acción', C.colorDeProducto({ nombre: 'Cucuruchón Grande', tipo_masa: 'Común' }).c === 'oklch(0.68 0.16 50)')
  chk('el de chocolate toma su marrón', clave('Mini Chocolate', { tipo_masa: 'Chocolate' }) === 'miniCh' && clave('Grande Chocolate', { tipo_masa: 'Chocolate' }) === 'grandeCh')
  chk('los barquillos por número y por "de 3 / de 4"', clave('Barquillo 35 · de 4', { categoria: 'barquillos' }) === 'b35_4' &&
    clave('Barquillo 40 · de 3', { categoria: 'barquillos' }) === 'b40_3')
  chk('un especial gana al tamaño (Cubanón Chico es Cubanón)', clave('Cubanón Chico') === 'cubanon' && clave('Vaso 125') === 'vaso' && clave('Obleas') === 'obleas')
  const raro = clave('Producto sin nombre conocido')
  chk('un nombre que no encaja toma uno de la paleta, siempre el mismo', raro in C.PALETA_PRODUCTO && clave('Producto sin nombre conocido') === raro)
  const t = C.tonoProducto([0.78, 0.15, 95])
  chk('la fórmula del README: suave oklch(0.955 C×0.3 H), oscuro oklch(min(L,0.5)−0.06 C×0.8 H)',
    t.c === 'oklch(0.78 0.15 95)' && t.t === 'oklch(0.955 0.045 95)' && t.dk === 'oklch(0.44 0.12 95)', JSON.stringify(t))

  // ── Productos: grupos, empaque, burbujas ──────────────────────────────
  const P = armar()
  await P.mostrarConfig('productos')
  const c = P.estado.config
  chk('abre en Productos de Cucuruchos Nuss', c.tab === 'productos' && c.unidadId === 'u-n')
  let h = cuerpo(P)
  chk('la lista solo trae los productos de la unidad', /data-cfg-sel="p-mini"/.test(h) && !/data-cfg-sel="d-soft"/.test(h))
  chk('COMUNES arriba y DE CHOCOLATE abajo', h.indexOf('>COMUNES<') >= 0 && h.indexOf('>COMUNES<') < h.indexOf('data-cfg-sel="p-mini"') &&
    h.indexOf('data-cfg-sel="p-mini"') < h.indexOf('>DE CHOCOLATE<') && h.indexOf('>DE CHOCOLATE<') < h.indexOf('data-cfg-sel="p-mini-ch"'))
  chk('sin empaque: SOLO la Caja Caserato del Mini (la inactiva y la de producto apagado no cuentan)', P.contarSinEmpaque(c.datos) === 1, String(P.contarSinEmpaque(c.datos)))
  chk('la burbuja de Productos dice cuántas faltan, en bordó', JSON.stringify(P.burbujaSeccion(c, 'productos')) === JSON.stringify({ n: 1, texto: '1 presentación sin empaque', grave: true }))
  chk('la burbuja de otra unidad no se muestra', P.burbujaSeccion({ ...c, resumen: { ...c.resumen, unidadId: 'u-d' } }, 'productos') === null)
  chk('la burbuja de Conos sale de mis_pendientes, gris', JSON.stringify(P.burbujaSeccion(c, 'marcas')) === JSON.stringify({ n: 2, texto: '2 conos nuevos por revisar', grave: false }))
  P.estado.conosPendientes = null
  chk('sin poder contar los conos, no hay burbuja (nunca un número inventado)', P.burbujaSeccion(c, 'marcas') === null)
  P.estado.conosPendientes = 2
  chk('la línea del empaque: la caja y cada renglón con su cantidad', P.lineaEmpaque(c.datos, 'p-mini-1') === 'Caja N°1 Nuss · 1 bolsa grande · 1 plancha · 3 separadores',
    P.lineaEmpaque(c.datos, 'p-mini-1'))
  chk('sin caja lo dice ("Sin caja · …")', /^Sin caja · /.test(P.lineaEmpaque(c.datos, 'p-grande-7')), P.lineaEmpaque(c.datos, 'p-grande-7'))
  chk('solo "sin ningún empaque" es falta: el Bolsón granel sin caja no lo es', P.sinNingunEmpaque(c.datos, 'p-mini-4') && !P.sinNingunEmpaque(c.datos, 'p-grande-7'))

  // Buscar en la lista repinta SOLO las filas.
  c.busquedaLista = 'grande'
  const filas = P.filasListaProductos(c)
  chk('buscar "grande" deja solo los Grande', /data-cfg-sel="p-grande"/.test(filas) && /data-cfg-sel="p-grande-ch"/.test(filas) && !/data-cfg-sel="p-mini"/.test(filas))
  c.busquedaLista = 'zzz'
  chk('buscar algo que no está lo dice', !/data-cfg-sel=/.test(P.filasListaProductos(c)))
  c.busquedaLista = ''

  // Elegir y volver (el celular: lista → detalle → lista → menú).
  P.elegirEnLista('p-grande')
  chk('elegir un producto abre su detalle', c.sel.productos === 'p-grande' && c.movilDetalle === true && /data-prod-activo="p-grande"/.test(cuerpo(P)))
  P.volverEnConfig()
  chk('"‹" desde el detalle vuelve a la lista, sin abrir el menú', c.movilDetalle === false && !P.__doc.body.classList.contains('pg-menu-abierto'))
  P.volverEnConfig()
  chk('"‹" desde la lista abre el menú', P.__doc.body.classList.contains('pg-menu-abierto'))

  // El editor de empaque: uno a la vez, y pregunta antes de soltar cambios.
  P.elegirEnLista('p-mini')
  P.abrirEmpaque('p-mini-1')
  chk('abrir el empaque de una presentación', c.empAbierto === 'p-mini-1' && /id="pr-cfg-editor-p-mini-1"/.test(cuerpo(P)))
  c.datos.borradores.get('p-mini-1').tocado = true
  P.abrirEmpaque('p-mini-2')
  chk('con cambios sin guardar, abrir otro pregunta y no suelta el primero', c.empAbierto === 'p-mini-1' && JSON.stringify(c.empPreguntar) === JSON.stringify({ pres: 'p-mini-2' }))
  P.elegirEnLista('p-chico')
  chk('… y cambiar de producto también pregunta', c.sel.productos === 'p-mini' && JSON.stringify(c.empPreguntar) === JSON.stringify({ producto: 'p-chico' }))
  c.empPreguntar = null
  c.datos.borradores.get('p-mini-1').tocado = false
  P.abrirEmpaque('p-mini-2')
  chk('sin cambios, abrir otro suelta el primero', c.empAbierto === 'p-mini-2' && c.empPreguntar === null)

  // Los interruptores se guardan al tocarlos y vuelven si la base rechaza.
  P.__setRpc(async (n) => n === 'guardar_producto' ? { data: null, error: { message: 'Esta presentación tiene stock.' } } : { data: null, error: null })
  const ok = await P.tocarActivoProducto('p-mini', false)
  const mini = c.datos.productos.find(x => x.id === 'p-mini')
  chk('apagar un producto llama a guardar_producto con activo false', rpcsDe(P, 'guardar_producto').at(-1)?.p_activo === false)
  chk('si la base rechaza, el interruptor vuelve a como estaba', ok === false && mini.activo === true)
  chk('… y el error de la base se dice pegado, con qué no se pudo', c.error?.donde === 'pr-cfg-prodsw' && c.error.texto === 'No se pudo apagar: Esta presentación tiene stock.', JSON.stringify(c.error))
  P.__setRpc(async () => ({ data: null, error: null }))
  const ok2 = await P.tocarActivaPresentacion('p-mini-2', false)
  const pres = c.datos.presentaciones.find(x => x.id === 'p-mini-2')
  const gp = rpcsDe(P, 'guardar_presentacion').at(-1)
  chk('apagar una presentación manda la fila entera con activa false', ok2 === true && pres.activa === false && gp?.p_activa === false && gp.p_nombre === 'Caja con cono' && gp.p_unidades_por_caja === 320,
    JSON.stringify(gp))
  chk('… y el recuento de lo que falta se recalcula', c.resumen.sinEmpaque === 1)

  // ── Recetas: el historial y "Volver a una versión" ────────────────────
  const R = armar()
  await R.mostrarConfig('recetas')
  const rc = R.estado.config
  R.elegirEnLista('maq-1')
  await Promise.resolve()
  await new Promise(r => setImmediate(r))
  const dr = rc.datos
  const versiones = dr.recetas.filter(r => r.tipo_masa === 'Común').sort((a, b) => b.version - a.version)
  chk('las tres versiones de la Máquina 1', versiones.map(r => r.version).join(',') === '3,2,1')
  chk('qué cambió de la v2 a la v3: solo lo que cambió, con antes y después',
    R.textoQueCambio(dr, versiones, versiones[0]) === 'Azúcar 12,00 → 12,50 · Fécula 1,20 → 1,50 · Agua 37,50 → 38,00', R.textoQueCambio(dr, versiones, versiones[0]))
  chk('la v1 es la primera', R.textoQueCambio(dr, versiones, versiones[2]) === 'Primera versión')
  const pv = R.parametrosVolverAVersion(rc, dr, versiones[2])
  chk('volver a la v1: los ingredientes de la v1, con la nota que lo dice',
    pv.p_maquina_id === 'maq-1' && pv.p_tipo_masa === 'Común' && pv.p_nota === 'Vuelve a la versión 1' && pv.p_items.length === 8 &&
    pv.p_items.find(i => i.ingrediente_id === 'g-grasa').cantidad_kg === 2.4, JSON.stringify(pv))
  R.__setRpc(async (n) => n === 'guardar_receta_original' ? { data: { version: 4 }, error: null } : { data: null, error: null })
  await R.accionReceta({ recetaVolver: 'r-maq-1-1' })
  chk('"Volver a esta versión" primero pide confirmar', rc.volverA === 'r-maq-1-1' && rpcsDe(R, 'guardar_receta_original').length === 0)
  await R.accionReceta({ recetaVolverSi: 'r-maq-1-1' })
  const gr = rpcsDe(R, 'guardar_receta_original')
  chk('… y al confirmar crea una versión NUEVA con guardar_receta_original', gr.length === 1 && JSON.stringify(gr[0]) === JSON.stringify(pv))
  chk('… y dice cuál quedó igual a cuál', R.__llamadas.exitos.some(m => m === 'Listo: la v4 es igual a la v1.'), JSON.stringify(R.__llamadas.exitos))

  // ── Ingredientes: sugerencias, conectar y quitar ──────────────────────
  const I = armar()
  await I.mostrarConfig('ingredientes')
  const ic = I.estado.config
  const grasa = ic.datos.ingredientes.find(g => g.id === 'g-grasa')
  const sug = I.sugerenciasIngrediente(ic.datos, grasa).map(i => i.id)
  chk('a la Grasa se le sugieren los insumos que se llaman "grasa"', sug.includes('i-gr-vac') && sug.includes('i-gr-veg') && !sug.includes('i-h-jup'), JSON.stringify(sug))
  chk('la Harina no se sugiere lo que ya tiene conectado', !I.sugerenciasIngrediente(ic.datos, ic.datos.ingredientes.find(g => g.id === 'g-harina')).some(i => i.id === 'i-h-jup'))
  await I.accionIngrediente({ ingConectar: 'g-harina|i-h-nueva' })
  const gi = rpcsDe(I, 'guardar_ingrediente_insumos').at(-1)
  chk('conectar suma el insumo a los que ya tenía', gi?.p_ingrediente_id === 'g-harina' && JSON.stringify(gi.p_insumo_ids) === JSON.stringify(['i-h-jup', 'i-h-cha', 'i-h-cla', 'i-h-wal', 'i-h-nueva']), JSON.stringify(gi))
  await I.accionIngrediente({ ingQuitar: 'g-harina|i-h-wal' })
  const gq = rpcsDe(I, 'guardar_ingrediente_insumos').at(-1)
  chk('quitar saca SOLO ese', JSON.stringify(gq.p_insumo_ids) === JSON.stringify(['i-h-jup', 'i-h-cha', 'i-h-cla']), JSON.stringify(gq))
  chk('el Agua (no descuenta stock) no cuenta como "no lleva lote"', !I.ingredientesSinInsumo(ic.datos).some(g => g.id === 'g-agua'))
  chk('Grasa, Colorante y Fécula no llevan lote', I.ingredientesSinInsumo(ic.datos).map(g => g.id).sort().join(',') === 'g-colorante,g-fecula,g-grasa')

  // ── Conos: filtros y resaltado ────────────────────────────────────────
  const K = armar()
  await K.mostrarConfig('marcas')
  const kc = K.estado.config
  const cuantos = (f) => K.conosDelFiltro(kc.datos, f).length
  chk('Todos: los 11 conos del catálogo', cuantos('todos') === 11)
  chk('Activos: los 5 aprobados y prendidos', cuantos('activos') === 5)
  chk('Apagados: los 4 que no están por revisar ni prendidos (el rechazado también)', cuantos('apagados') === 4)
  chk('Por revisar: los 2 pendientes', cuantos('revisar') === 2)
  chk('abre en "Todos", como el diseño', kc.filtroConos === 'todos')
  chk('el resaltado marca lo buscado sin importar mayúsculas', K.htmlResaltado('Caserato · Mini', 'cas') === '<mark class="pc-hl">Cas</mark>erato · Mini')
  chk('… ni acentos, y respeta el texto original', K.htmlResaltado('Cubanón', 'banon') === 'Cu<mark class="pc-hl">banón</mark>')
  chk('lo resaltado se escapa igual', K.htmlResaltado('<b>Cas</b>', 'cas') === '&lt;b&gt;<mark class="pc-hl">Cas</mark>&lt;/b&gt;', K.htmlResaltado('<b>Cas</b>', 'cas'))
  chk('sin búsqueda, solo escapa', K.htmlResaltado('A&B', '') === 'A&amp;B')
  kc.busqueda = 'cas'
  kc.listaConos = null
  K.pintarPestanaConfig()
  h = cuerpo(K)
  chk('buscar "cas" dice cuántos y resalta', /conos con “cas”/.test(h) && /<mark class="pc-hl">Cas<\/mark>erato/.test(h))
  chk('los pendientes van ARRIBA de la lista', h.indexOf('id="pr-cfg-pendientes"') >= 0 && h.indexOf('id="pr-cfg-pendientes"') < h.indexOf('id="pr-cfg-marcas-lista"'))
  chk('dice quién cargó el cono y cuándo', /lo cargó Agustín Barrera en la tablet, hoy \d\d:\d\d/.test(h) || /lo cargó Agustín Barrera en la tablet/.test(h))

  // ── Texto de la base, escapado en TODAS las secciones ─────────────────
  const T = copia(DATOS.tablas)
  T.productos_terminados.find(p => p.id === 'p-mini').nombre = marca('producto')
  T.producto_presentaciones.find(p => p.id === 'p-mini-1').nombre = marca('presentación')
  T.insumos.find(i => i.id === 'i-caja1').nombre = marca('insumo')
  T.maquinas.find(m => m.id === 'maq-1').nombre = marca('máquina')
  T.ingredientes.find(g => g.id === 'g-grasa').nombre = marca('ingrediente')
  T.marcas_personalizadas.find(m => m.id === 'm-cas-mini').nombre = marca('cono pendiente')
  T.marcas_personalizadas.find(m => m.id === 'm-lolo').nombre = marca('cono')
  T.recetas.find(r => r.id === 'r-maq-1-3').nota = marca('nota de receta')
  T.v_empleados_publico.find(e => e.id === 'emp-agustin').nombre = marca('quien cargó')
  const RP = copia(DATOS.rpc)
  RP.personal_produccion.find(p => p.id === 'emp-diego').nombre = marca('persona')

  const X = armar(T, RP)
  await X.mostrarConfig('productos')
  X.elegirEnLista('p-mini')
  X.abrirEmpaque('p-mini-1')
  chequearMarcas(chk, 'Productos', cuerpo(X), ['producto', 'presentación', 'insumo'])
  await X.cambiarSeccionConfig('maquinas')
  X.elegirEnLista('maq-1')
  chequearMarcas(chk, 'Máquinas', cuerpo(X), ['máquina'])
  await X.cambiarSeccionConfig('recetas')
  X.elegirEnLista('maq-1')
  await new Promise(r => setImmediate(r))
  chequearMarcas(chk, 'Recetas', cuerpo(X), ['máquina', 'nota de receta', 'ingrediente'])
  await X.cambiarSeccionConfig('ingredientes')
  X.elegirEnLista('g-grasa')
  chequearMarcas(chk, 'Ingredientes', cuerpo(X), ['ingrediente'])
  await X.cambiarSeccionConfig('marcas')
  chequearMarcas(chk, 'Conos', cuerpo(X), ['cono pendiente', 'cono', 'quien cargó'])
  await X.cambiarSeccionConfig('personal')
  chequearMarcas(chk, 'Personal', cuerpo(X), ['persona'])
  chequearMarcas(chk, 'Segmentado y título', X.__doc.getElementById('pr-config-secciones').innerHTML, [])
}

main().then(() => Promise.all(esperas)).then(fin).catch(e => { console.log('EXCEPCIÓN', e?.stack ?? e); process.exit(1) })
