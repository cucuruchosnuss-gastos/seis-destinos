// Ingreso de producto terminado: "Producción propia" (24/10/2026). En la
// gestión de Producción, el ingreso suma un tercer origen, arriba de todo:
// "Producción propia (<esta fábrica>)" (los barquillos de Dolce Pasta, que se
// hacen ahí sin planilla). Lo que se prueba, EJECUTANDO las funciones reales:
//  - a la base va p_unidad_origen_id = la fábrica que recibe y
//    p_proveedor_id = null (ingresar_producto_terminado lo acepta desde el
//    24/10/2026: leída con pg_get_functiondef ese día);
//  - el lote es obligatorio y se llama "Lote de fabricación"; NO se pregunta
//    "Último lote: X. ¿Sigue siendo este?" (cada tanda trae el suyo); sin
//    lote no se manda ("poné el lote de fabricación", como la base);
//  - sin precio (no viaja) y sin remito obligatorio;
//  - un producto con origen_tipo 'fabrica' la trae elegida, salvo que el
//    origen se haya elegido a mano; si ya no queda ninguno, se suelta;
//  - el nombre de la fábrica va escapado; el error de la base, tal cual;
//  - las salidas entre fábricas no listan la producción propia.
// Y el baseline (BASE, un commit fijo): los controles del ingreso de antes
// siguen todos.
//
//   node pruebas/test-produccion-ingreso-propia.js
//   ARCHIVO_GESTION=<copia de modulos/produccion-gestion.html> node pruebas/test-produccion-ingreso-propia.js
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'produccion-gestion.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const RAIZ = path.join(__dirname, '..')
// El ingreso como estaba antes de la producción propia (main del 24/10/2026).
const BASE = 'd2d1dc1'
const { chk, fin } = arnes()

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  ${fuenteNumeros()}
  var __rpc = [], __consultas = [], __respuestasFrom = []
  var __respuesta = () => ({ data: { ingreso_id: 'ing-1', renglones: 1, cajas: 8, importe: 0 }, error: null })
  var __exitos = [], __stock = 0, __focos = []
  var supabase = {
    rpc(n, p) { __rpc.push([n, p]); return new Promise(r => setTimeout(() => r(__respuesta(n, p)), 0)) },
    from(tabla) {
      const q = { tabla, filtros: [] }
      __consultas.push(q)
      const r = __respuestasFrom.shift() ?? { data: [], error: null }
      const c = {
        select() { return c }, eq(k, v) { q.filtros.push(['eq', k, v]); return c }, gte() { return c }, lte() { return c }, order() { return c },
        then(ok, mal) { return Promise.resolve(r).then(ok, mal) },
      }
      return c
    },
  }
  function mostrarExito(m) { __exitos.push(m) }
  async function mostrarStockTerminado() { __stock++ }
  function hoyArgentina() { return '2026-10-24' }
  async function cargarCatalogoIngreso() {}
  function pintarSalidas() {}
  function pintarProductosSalidas() {}
  // Un document mínimo: el cuerpo del formulario guarda su innerHTML.
  var __cuerpo = { innerHTML: '', querySelector: () => null }
  var document = { getElementById: (id) => id === 'pr-ing-cuerpo' ? __cuerpo : null, querySelector: () => null }
  var estado = { miRolApp: 'super_admin', unidades: new Map([['u-n', 'Cucuruchos Nuss'], ['u-d', 'Dolce Pasta'], ['u-m', 'Mengui']]) }
`
const FUNCIONES = ['esc', 'textoPlano', 'normalizarBusqueda', 'puedeIngresarEn', 'unidadesDeIngreso', 'nuevoRenglonIngreso', 'nuevoIngreso',
  'elegirOrigenIngreso', 'soltarLoteDeOrigen', 'sugerirOrigenIngreso', 'origenTipoDe', 'origenParaBase', 'presentacionDe', 'itemsParaBase',
  'faltaIngreso', 'parametrosIngreso', 'normalizarLoteIngreso', 'modoLoteIngreso', 'loteDeRenglon', 'htmlLoteIngreso', 'contestarLoteIngreso',
  'textoListoIngreso', 'proveedoresQueCoinciden', 'opcionesIngreso', 'htmlRenglonIngreso', 'mostrarErrorIngreso', 'guardarIngreso',
  'pintarProveedoresIngreso', 'pintarIngreso', 'renglonIngreso', 'alCambiarIngreso', 'alTocarIngreso', 'cargarSalidas']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['TAREAS_INGRESO', 'LARGO_MAXIMO_LOTE', 'ORIGENES_INGRESO', 'TOPE_FILAS', 'COLUMNAS_SALIDAS'],
    retorno: `ORIGENES_INGRESO, TOPE_FILAS, COLUMNAS_SALIDAS, estado, __rpc, __exitos, __consultas, __respuestasFrom, __cuerpo, __stock: () => __stock, __setRespuesta(f){ __respuesta = f }`,
  })
}

// Dolce Pasta: un barquillo que se hace ahí (origen_tipo 'fabrica', con lote
// vigente: igual NO se pregunta) y una pasta que viene de afuera (sin origen).
const CAT = {
  productos: [
    { id: 'pd1', nombre: 'Cono dulce 35 x4', origen_tipo: 'fabrica' },
    { id: 'pd2', nombre: 'Ñoquis', origen_tipo: null },
    { id: 'pd3', nombre: 'Cono dulce 40 x4', origen_tipo: 'fabrica' },
  ],
  presentaciones: [
    { id: 'prd1', producto_id: 'pd1', nombre: 'Caja x 120', con_cono: false },
    { id: 'prd2', producto_id: 'pd2', nombre: 'Bolsa x 10', con_cono: false },
    { id: 'prd3', producto_id: 'pd3', nombre: 'Caja x 120', con_cono: false },
  ],
  marcas: [],
  vigentes: new Map([['pd1', 'B-0910'], ['pd2', 'N-1']]),
}
const esperar = () => new Promise(r => setTimeout(r, 5))

function ingreso(S) {
  const ing = S.nuevoIngreso('u-d', '2026-10-24')
  ing.catalogo = CAT
  S.estado.ing = ing
  return ing
}
// Un cambio en un select de un renglón, como lo manda el navegador.
function cambiar(S, ing, i, campo, valor) {
  const r = ing.renglones[i]
  const t = { id: '', value: valor, dataset: { ingCampo: campo }, closest: () => ({ dataset: { ingRenglon: r.id } }) }
  S.alCambiarIngreso({ target: t })
}
// Un toque en un botón del formulario.
function tocar(S, dataset, id = '') {
  const b = { id, dataset, closest: () => null }
  S.alTocarIngreso({ target: { closest: (sel) => sel === 'button' ? b : null } })
}

;(async () => {
  // ── El origen: producción propia, a la base ────────────────────────────
  {
    const S = sandbox()
    const ing = ingreso(S)
    S.elegirOrigenIngreso(ing, 'propia')
    chk('se puede elegir producción propia', ing.origen === 'propia' && ing.origenAMano === true)
    let o = S.origenParaBase(ing)
    chk('producción propia: el origen es la MISMA fábrica y el proveedor null', o.p_unidad_origen_id === 'u-d' && o.p_proveedor_id === null, JSON.stringify(o))
    ing.unidadId = 'u-n'
    chk('… la fábrica que recibe en ese momento (no una guardada)', S.origenParaBase(ing).p_unidad_origen_id === 'u-n')
    ing.unidadId = 'u-d'
    S.elegirOrigenIngreso(ing, 'proveedor'); ing.proveedorId = 'prov-1'; ing.proveedorNombre = 'Rodrigo'
    S.elegirOrigenIngreso(ing, 'propia')
    chk('pasar a producción propia SUELTA el proveedor', ing.proveedorId === null && ing.proveedorNombre === '' && S.origenParaBase(ing).p_proveedor_id === null)
    S.elegirOrigenIngreso(ing, 'fabrica'); ing.unidadOrigenId = 'u-m'
    S.elegirOrigenIngreso(ing, 'propia')
    chk('pasar a producción propia SUELTA la otra fábrica', ing.unidadOrigenId === '')
    S.elegirOrigenIngreso(ing, 'fabrica'); ing.unidadOrigenId = 'u-m'
    o = S.origenParaBase(ing)
    chk('otra fábrica sigue igual (la elegida, no la que recibe)', o.p_unidad_origen_id === 'u-m' && o.p_proveedor_id === null)
    // Aunque el estado quedara sucio, a la base va solo la fábrica que recibe.
    o = S.origenParaBase({ origen: 'propia', unidadId: 'u-d', proveedorId: 'prov-1', unidadOrigenId: 'u-m' })
    chk('con proveedor y otra fábrica cargados y origen propia: solo la que recibe', o.p_proveedor_id === null && o.p_unidad_origen_id === 'u-d', JSON.stringify(o))
    chk('los tres orígenes, producción propia primero', JSON.stringify(S.ORIGENES_INGRESO) === '["propia","proveedor","fabrica"]')
  }

  // ── El lote de fabricación ─────────────────────────────────────────────
  {
    const S = sandbox()
    const ing = ingreso(S)
    S.elegirOrigenIngreso(ing, 'propia')
    Object.assign(ing.renglones[0], { productoId: 'pd1', presentacionId: 'prd1', cajas: 8, loteVigente: 'B-0910' })
    const r = ing.renglones[0]
    chk('con producción propia el lote no se pregunta: se escribe', S.modoLoteIngreso(r, ing) === 'fabricacion', S.modoLoteIngreso(r, ing))
    const h = S.htmlLoteIngreso(r, ing)
    chk('el campo se llama "Lote de fabricación"', /<span class="pr-campo__rotulo">Lote de fabricación<\/span>/.test(h), h)
    chk('… sin "Último lote" ni "¿Sigue siendo este?" (aunque haya vigente)', !/Último lote/.test(h) && !/Sigue siendo/.test(h) && !/data-ing-lote=/.test(h))
    chk('… vacío y obligatorio, no de solo lectura', /value=""/.test(h) && /required aria-required="true"/.test(h) && !/readonly/.test(h) && !/disabled/.test(h))
    chk('… con el largo máximo de 40', /maxlength="40"/.test(h))
    chk('sin lote NO se guarda, con el texto de la base', S.faltaIngreso(ing, CAT) === 'Renglón 1: poné el lote de fabricación.', S.faltaIngreso(ing, CAT))
    r.lote = '   '
    chk('… solo espacios tampoco', S.faltaIngreso(ing, CAT) === 'Renglón 1: poné el lote de fabricación.')
    r.lote = ' t-2410 '
    chk('con lote: nada falta (sin remito, que es opcional)', S.faltaIngreso(ing, CAT) === null && !ing.remito, S.faltaIngreso(ing, CAT))
    const p = S.parametrosIngreso(ing, CAT)
    chk('viaja el lote escrito, en mayúsculas y recortado (no el vigente)', p.p_items[0].lote === 'T-2410', p.p_items[0].lote)
    chk('remito vacío = null', p.p_remito === null)
    r.precio = 900
    chk('el precio NO viaja en producción propia', S.parametrosIngreso(ing, CAT).p_items[0].precio_caja === null)
    chk('… ni se pide', !/data-ing-campo="precio"/.test(S.htmlRenglonIngreso(r, 0, ing)))
    chk('el renglón dibuja el lote de fabricación', /Lote de fabricación/.test(S.htmlRenglonIngreso(r, 0, ing)))
    // Con "otro" origen, el mismo renglón vuelve a preguntar por el vigente.
    S.elegirOrigenIngreso(ing, 'fabrica')
    chk('con otra fábrica vuelve la pregunta del último lote', S.modoLoteIngreso(r, ing) === 'pregunta' && /¿Sigue siendo este\?/.test(S.htmlLoteIngreso(r, ing)))
    chk('… y el rótulo vuelve a "Lote"', /<span class="pr-campo__rotulo">Lote<\/span>/.test(S.htmlLoteIngreso({ ...r, loteResp: 'otro' }, ing)))
    // Sí copiaba el vigente: al pasar a producción propia, eso se suelta.
    S.contestarLoteIngreso(ing, r, 'si')
    chk('(con otra fábrica, Sí pone el vigente)', r.lote === 'B-0910' && r.loteResp === 'si')
    S.elegirOrigenIngreso(ing, 'propia')
    chk('pasar a producción propia SUELTA el vigente aceptado con Sí', r.lote === '' && r.loteResp === '', JSON.stringify({ lote: r.lote, resp: r.loteResp }))
    chk('… y hay que escribir el de la tanda', S.faltaIngreso(ing, CAT) === 'Renglón 1: poné el lote de fabricación.')
    r.lote = 'T-9'
    S.elegirOrigenIngreso(ing, 'propia')
    chk('volver a tocar producción propia no borra lo escrito', r.lote === 'T-9')
    S.elegirOrigenIngreso(ing, 'proveedor')
    chk('salir de producción propia: se vuelve a preguntar por el vigente', r.loteResp === '' && S.modoLoteIngreso(r, ing) === 'pregunta')
    S.contestarLoteIngreso(ing, r, 'si')
    S.elegirOrigenIngreso(ing, 'fabrica')
    chk('entre proveedor y otra fábrica la respuesta del lote se conserva (como antes)', r.loteResp === 'si' && r.lote === 'B-0910')
    S.elegirOrigenIngreso(ing, 'proveedor')
    const sin = S.htmlLoteIngreso({ ...S.nuevoRenglonIngreso() }, { origen: 'propia' })
    chk('sin producto, el campo apagado también dice "Lote de fabricación"', /Lote de fabricación/.test(sin) && /disabled/.test(sin))
    // El segundo renglón también se controla.
    S.elegirOrigenIngreso(ing, 'propia')
    r.lote = 'T-1'
    ing.renglones.push({ ...S.nuevoRenglonIngreso(), productoId: 'pd3', presentacionId: 'prd3', cajas: 2 })
    chk('cada renglón con su lote de fabricación', S.faltaIngreso(ing, CAT) === 'Renglón 2: poné el lote de fabricación.', S.faltaIngreso(ing, CAT))
  }

  // ── Elegida por defecto con origen_tipo 'fabrica' ──────────────────────
  {
    const S = sandbox()
    const ing = ingreso(S)
    chk('de entrada, sin origen', ing.origen === null && ing.origenAMano === false)
    cambiar(S, ing, 0, 'productoId', 'pd1')
    chk('un producto de origen_tipo fabrica trae elegida producción propia', ing.origen === 'propia', ing.origen)
    chk('… sin marcarla como elegida a mano', ing.origenAMano === false)
    chk('… y el lote se escribe (no se pregunta, aunque tenga vigente)', S.modoLoteIngreso(ing.renglones[0], ing) === 'fabricacion')
    chk('la presentación única se eligió sola, como siempre', ing.renglones[0].presentacionId === 'prd1')
    cambiar(S, ing, 0, 'productoId', 'pd2')
    chk('si ya no queda ninguno de fábrica, el origen sugerido se suelta', ing.origen === null, ing.origen)
    cambiar(S, ing, 0, 'productoId', 'pd1')
    ing.renglones.push(S.nuevoRenglonIngreso())
    cambiar(S, ing, 1, 'productoId', 'pd2')
    chk('con uno de fábrica entre varios, sigue producción propia', ing.origen === 'propia')
    tocar(S, { ingQuitar: ing.renglones[0].id })
    chk('quitar el renglón de fábrica la suelta', ing.renglones.length === 1 && ing.origen === null, ing.origen)
  }
  {
    const S = sandbox()
    const ing = ingreso(S)
    tocar(S, { ingOrigen: 'proveedor' })
    chk('tocar un origen lo marca como elegido a mano', ing.origen === 'proveedor' && ing.origenAMano === true)
    cambiar(S, ing, 0, 'productoId', 'pd1')
    chk('lo elegido a mano NO se pisa con un producto de fábrica', ing.origen === 'proveedor', ing.origen)
    chk('… y el lote se pregunta como siempre', S.modoLoteIngreso(ing.renglones[0], ing) === 'pregunta')
  }
  {
    const S = sandbox()
    const ing = ingreso(S)
    tocar(S, { ingOrigen: 'propia' })
    cambiar(S, ing, 0, 'productoId', 'pd2')
    chk('producción propia elegida a mano NO se suelta con un producto de afuera', ing.origen === 'propia')
  }
  {
    const S = sandbox()
    const ing = ingreso(S)
    cambiar(S, ing, 0, 'productoId', 'pd2')
    chk('un producto sin origen_tipo no elige nada', ing.origen === null)
    S.sugerirOrigenIngreso(null)
    chk('sin formulario, sugerir no rompe', true)
    chk('origenTipoDe: lo del catálogo, o null', S.origenTipoDe(CAT, 'pd1') === 'fabrica' && S.origenTipoDe(CAT, 'pd2') === null && S.origenTipoDe(null, 'pd1') === null)
  }
  {
    // Cambiar la fábrica que recibe vacía los renglones: un origen sugerido se suelta.
    const S = sandbox()
    const ing = ingreso(S)
    cambiar(S, ing, 0, 'productoId', 'pd1')
    S.alCambiarIngreso({ target: { id: 'pr-ing-unidad', value: 'u-n', dataset: {}, closest: () => null } })
    chk('cambiar la fábrica que recibe suelta el origen sugerido', ing.unidadId === 'u-n' && ing.origen === null, ing.origen)
  }

  // ── La pantalla: el botón arriba de todo, con el nombre escapado ───────
  {
    const S = sandbox()
    const ing = ingreso(S)
    S.pintarIngreso()
    const h = S.__cuerpo.innerHTML
    const i = h.indexOf('data-ing-origen="propia"'), j = h.indexOf('data-ing-origen="proveedor"'), k = h.indexOf('data-ing-origen="fabrica"')
    chk('el botón de producción propia está, PRIMERO', i > 0 && i < j && j < k, [i, j, k].join(','))
    chk('… dice "Producción propia (Dolce Pasta)"', /data-ing-origen="propia" aria-pressed="false">Producción propia \(Dolce Pasta\)<\/button>/.test(h))
    chk('… ocupa toda la fila', /class="pr-ing__op pr-ing__op--propia" data-ing-origen="propia"/.test(h) && /\.pr-ing__op--propia \{ grid-column: 1 \/ -1; \}/.test(HTML))
    chk('sin elegir no hay nota', !/pr-ing__nota/.test(h))
    S.elegirOrigenIngreso(ing, 'propia')
    S.pintarIngreso()
    const hp = S.__cuerpo.innerHTML
    chk('elegida: marcada', /data-ing-origen="propia" aria-pressed="true"/.test(hp) && /data-ing-origen="proveedor" aria-pressed="false"/.test(hp))
    chk('… con la nota de que no genera deuda', /pr-ing__nota">Lo hizo esta fábrica: cada producto lleva el lote de fabricación de la tanda\. No genera deuda entre empresas\.</.test(hp))
    chk('… sin buscador de proveedor ni selector de otra fábrica', !/id="pr-ing-buscar"/.test(hp) && !/id="pr-ing-origen-unidad"/.test(hp))
    chk('… y el remito sigue opcional', /Remito \(opcional\)/.test(hp))
    S.estado.unidades.set('u-d', '<img src=x onerror=alert(1)>')
    S.pintarIngreso()
    const hx = S.__cuerpo.innerHTML
    chk('el nombre de la fábrica va escapado', !/<img src=x/.test(hx) && /Producción propia \(&lt;img src=x onerror=alert\(1\)&gt;\)/.test(hx))
    S.estado.unidades.delete('u-d')
    S.pintarIngreso()
    chk('una fábrica sin nombre: "esta fábrica"', /Producción propia \(esta fábrica\)/.test(S.__cuerpo.innerHTML))
  }

  // ── Guardar: una llamada, el error tal cual, el mismo uuid ─────────────
  {
    const S = sandbox()
    const ing = ingreso(S)
    cambiar(S, ing, 0, 'productoId', 'pd1')
    Object.assign(ing.renglones[0], { cajas: 8 })
    await S.guardarIngreso()
    chk('sin lote de fabricación no llama a la base', S.__rpc.length === 0 && ing.error === 'Renglón 1: poné el lote de fabricación.', ing.error)
    ing.renglones[0].lote = 't-2410'
    S.__setRespuesta(() => ({ data: null, error: { message: 'Renglón 1: poné el lote de fabricación.', code: 'P0001' } }))
    await S.guardarIngreso()
    chk('el error de la base tal cual', ing.error === 'Renglón 1: poné el lote de fabricación.' && S.estado.ing === ing && ing.enviando === false, ing.error)
    S.__setRespuesta(() => ({ data: { ingreso_id: 'ing-9', renglones: 1, cajas: 8, importe: 0 }, error: null }))
    await S.guardarIngreso(); await esperar()
    const llamadas = S.__rpc.filter(x => x[0] === 'ingresar_producto_terminado')
    chk('el reintento manda el MISMO client_uuid', llamadas.length === 2 && llamadas[0][1].p_client_uuid === llamadas[1][1].p_client_uuid)
    const p = llamadas[1][1]
    chk('a la base: la misma fábrica de origen y destino, sin proveedor', p.p_unidad_negocio_id === 'u-d' && p.p_unidad_origen_id === 'u-d' && p.p_proveedor_id === null, JSON.stringify(p))
    chk('el renglón como lo espera la base', JSON.stringify(p.p_items) === JSON.stringify([{ presentacion_id: 'prd1', marca_id: null, cajas: 8, lote: 'T-2410', precio_caja: null }]), JSON.stringify(p.p_items))
    chk('"Listo: entraron 8 cajas." y vuelve al stock de la fábrica', S.__exitos[0] === 'Listo: entraron 8 cajas.' && S.__stock() === 1 && S.estado.stockUnidad === 'u-d', S.__exitos[0])
    chk('nunca guardar_lote_vigente (lo hace la base)', !S.__rpc.some(x => x[0] === 'guardar_lote_vigente'))
  }

  // ── Las salidas entre fábricas no listan la producción propia ──────────
  {
    const S = sandbox()
    S.estado.salidas = { origenId: 'u-d', desde: '2026-10-01', hasta: '2026-10-24', turno: 0, filas: null, producto: '' }
    S.__respuestasFrom.push({ data: [
      { id: 's1', unidad_origen_id: 'u-d', destino_id: 'u-n', producto: 'Cono dulce 35 x4', cajas: 10 },
      { id: 's2', unidad_origen_id: 'u-d', destino_id: 'u-d', producto: 'Cono dulce 35 x4', cajas: 8 },
    ], error: null })
    await S.cargarSalidas()
    chk('una salida a otra fábrica sí; la producción propia (origen = destino) no', JSON.stringify(S.estado.salidas.filas.map(f => f.id)) === '["s1"]', JSON.stringify(S.estado.salidas.filas))
    chk('… y la consulta es la de siempre (por la fábrica de origen)', S.__consultas.at(-1).tabla === 'v_salidas_entre_fabricas' && JSON.stringify(S.__consultas.at(-1).filtros) === JSON.stringify([['eq', 'unidad_origen_id', 'u-d']]))
    S.__respuestasFrom.push({ data: Array.from({ length: S.TOPE_FILAS }, (_, i) => ({ id: 'x' + i, unidad_origen_id: 'u-d', destino_id: 'u-d' })), error: null })
    await S.cargarSalidas()
    chk('el aviso de 1000 filas cuenta lo que trajo la base (antes de sacar la propia)', S.estado.salidas.recortado === true && S.estado.salidas.filas.length === 0)
    chk('las columnas traen destino_id (con qué se compara)', /\bdestino_id\b/.test(S.COLUMNAS_SALIDAS) && /\bunidad_origen_id\b/.test(S.COLUMNAS_SALIDAS))
  }

  // ── El catálogo trae origen_tipo ───────────────────────────────────────
  chk('el catálogo del ingreso lee origen_tipo de productos_terminados',
    /from\('productos_terminados'\)\.select\('id, nombre, orden, tipo_masa, origen_tipo'\)\.eq\('unidad_negocio_id', unidadId\)\.eq\('activo', true\)/.test(HTML))
  chk('la tablet no se tocó (produccion.html no tiene la producción propia)', !/data-ing-origen|Producción propia/.test(fs.readFileSync(path.join(RAIZ, 'modulos', 'produccion.html'), 'utf8')))

  // ── Baseline: el ingreso de antes sigue entero ─────────────────────────
  {
    const viejo = execFileSync('git', ['show', `${BASE}:modulos/produccion-gestion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const controles = (src) => new Set([...src.matchAll(/\b(data-ing-[a-z-]+="?[a-z]*|id="pr-ing-[a-z-]+")/g)].map(m => m[1]))
    const antes = controles(viejo), ahora = controles(HTML)
    const faltan = [...antes].filter(c => !ahora.has(c))
    chk(`los controles del ingreso de ${BASE} siguen todos (${antes.size})`, antes.size > 15 && faltan.length === 0, faltan.join(', '))
    chk(`… y el botón nuevo es el único que se sumó al origen`, ahora.has('data-ing-origen="propia') && !antes.has('data-ing-origen="propia'))
  }

  fin()
})().catch(e => { console.error(e); process.exit(1) })
