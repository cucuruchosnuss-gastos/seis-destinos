// La planta en la tablet real (28/09/2026) — parte C, las pantallas:
//  7. el PIN como ventana en el centro, con el fondo oscurecido (también el
//     maestro y "Asignar PIN"), que siempre tiene salida;
//  8. Abrir turno: los operarios como etiquetas chicas (ver test-produccion-abrir);
//  9. la receta: Original / Anterior / Modificar en una fila, sin pastilla aparte;
// 10. la ventana de lotes (ver test-produccion-lotes);
// 11. lo producido en tres columnas: tocar una opción la ELIGE Y PASA SOLA, la
//     familia chica y el tamaño grande, el chocolate aparte y en marrón, "Con
//     cono" de colores y "Sin cono" blanco;
// 12. corregir TODO un renglón con corregir_produccion_item_completo;
// 13. el renglón de lo producido en una línea, con "Anular";
// 14. las paradas en bordó;
// 16. el reloj.
// Se EJECUTAN las funciones reales, más HTML malicioso en cada render nuevo.
//
//   node pruebas/test-produccion-pantallas.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const CAT = {
  productos: [
    { id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 },
    { id: 'p-cono', nombre: 'Cono dulce 35 x4', tipo_masa: 'Común', orden: 2 },
    { id: 'p-choco', nombre: 'Cucuruchón Mini Chocolate', tipo_masa: 'Chocolate', orden: 3 },
  ],
  presentaciones: [
    { id: 'pr-con', producto_id: 'p-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 320, orden: 1 },
    { id: 'pr-sin', producto_id: 'p-mini', nombre: 'Caja sin cono', con_cono: false, media_caja: false, unidades_por_caja: 320, orden: 2 },
    { id: 'pr-choco', producto_id: 'p-choco', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 320, orden: 1 },
  ],
  marcas: [{ id: 'mk-fabri', nombre: 'FABRI', estado_alta: 'aprobada' }, { id: 'mk-cas', nombre: 'CASERATO', estado_alta: 'aprobada' }],
  cajas: [
    { presentacion_id: 'pr-con', insumo_id: 'c-nuss', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-con', insumo_id: 'c-dp', embolsado_sugerido: 'individual' },
    { presentacion_id: 'pr-sin', insumo_id: 'c-nuss', embolsado_sugerido: 'grande' },
  ],
  empaque: [], insumos: [{ id: 'c-nuss', nombre: 'Caja N°1', marca: 'Nuss' }, { id: 'c-dp', nombre: 'Caja N°1', marca: 'Dolce Pasta' }],
  cajaPredeterminadaId: null, empaqueError: false,
}
const ITEM = { id: 'it-1', orden: 1, sublote: '7037-1', presentacion_id: 'pr-con', marca_id: 'mk-fabri', cajas: 25, unidades_por_caja: 320,
  unidades: 8000, anulado: false, caja_insumo_id: 'c-nuss', embolsado: 'grande' }

function armar() {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidadId = 'u-cn'
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.catalogo = JSON.parse(JSON.stringify(CAT))
  S.estado.planilla = { turno: { id: 't37', lote: 7037, estado: 'abierto', turno: 'Mañana' }, operarios: [], masas: [], paradas: [],
    items: [{ ...ITEM }], insumosCaja: CAT.insumos, marcasItems: [], maquinaNombre: 'Máquina 1' }
  S.__tablas.produccion_items = [{ ...ITEM }]
  S.__tablas.turnos_produccion = () => ({ data: [S.estado.planilla.turno], error: null })
  return S
}
const html = (S, id) => S.__doc.getElementById(id).innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)

// ── 7. El PIN como ventana ───────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'], puestos_temporales: [] }]
  S.estado.pin = null
  S.pintarPin()
  chk('7. sin nadie elegido, ni ventana ni fondo', S.__doc.getElementById('pr-pin').hidden === true && S.__doc.getElementById('pr-pin-fondo').hidden === true)
  S.estado.pin = S.nuevoPanelPin('persona', { id: 'e-fede', nombre: 'Federico Silva' }, 'encargado')
  S.pintarPin()
  chk('7. al tocar a alguien: la ventana y el fondo oscurecido', S.__doc.getElementById('pr-pin').hidden === false && S.__doc.getElementById('pr-pin-fondo').hidden === false)
  // Planta v2: la salida es la ✕ de la ventana (nunca se esconde); lo que
  // hace lo dice su aria-label.
  chk('7. la ventana siempre tiene salida', S.__doc.getElementById('pr-pin-otra').hidden !== true &&
    /<button type="button" class="pr-pin__cerrar" id="pr-pin-otra" aria-label="Cerrar">/.test(FUENTE) &&
    S.__doc.getElementById('pr-pin-otra').getAttribute('aria-label') === 'Elegir otra persona')
  chk('7. el teclado entero, del 1 al 0', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].every(d => new RegExp(`data-tecla="${d}"`).test(html(S, 'pr-pin-teclado'))))
  S.estado.quienFija = { id: 'e-fede', nombre: 'Federico Silva' }
  S.pintarPin()
  chk('7. con la persona guardada, la salida es "Soy otra persona"', S.__doc.getElementById('pr-pin-otra').getAttribute('aria-label') === 'Soy otra persona')
  S.estado.quienFija = null
  S.estado.pin = S.nuevoPanelPin('maestro', null, null)
  S.pintarPin()
  chk('7. el PIN maestro, en la misma ventana, con "Cancelar"', S.__doc.getElementById('pr-pin').hidden === false &&
    S.__doc.getElementById('pr-pin-otra').getAttribute('aria-label') === 'Cancelar')
  chk('7. es un diálogo', /id="pr-pin" hidden role="dialog" aria-modal="true"/.test(FUENTE))
  chk('7. el fondo y Escape cierran la ventana', /getElementById\('pr-pin-fondo'\)\.addEventListener\('click', \(\) => \{ if \(!estado\.pin\?\.enviando\) cerrarPin\(\) \}\)/.test(FUENTE) &&
    /if \(ev\.key !== 'Escape'\) return\s+if \(estado\.vista === 'pr-quien' && estado\.pin && !estado\.pin\.enviando\) cerrarPin\(\)/.test(FUENTE))
  // Planta v2 (CSS nuevo, tokens --p-*): la ventana y el panel de Asignar
  // PIN, centrados y fijos, con el z-index ARRIBA del fondo.
  {
    const zDe = re => Number((FUENTE.match(re) || [])[1])
    const zPin = zDe(/\n    \.pr-pin \{\s*position: fixed; z-index: (\d+); left: 50%; top: 50%; transform: translate\(-50%, -50%\);/)
    const zAsig = zDe(/\n    \.pr-asignar__panel \{\s*position: fixed; z-index: (\d+); left: 50%; top: 50%; transform: translate\(-50%, -50%\);/)
    const zFondo = zDe(/\.pr-pin-fondo \{ position: fixed; inset: 0; z-index: (\d+);/)
    chk('7. la ventana va centrada y fija, arriba del fondo', zPin > zFondo && zAsig > zFondo, JSON.stringify({ zPin, zAsig, zFondo }))
  }
  chk('7. la lista de personas ocupa toda la pantalla', /\.pr-quien__cuerpo \{ flex: 1; min-height: 0;/.test(FUENTE) &&
    /\.pr-quien__nombres \{\s*flex: 1; min-height: 0; display: grid;/.test(FUENTE))

  // Asignar PIN: la misma ventana, con su fondo y su "Cancelar".
  const A = armar()
  A.estado.personal = [{ id: 'e-ana', nombre: 'Ana Masera', misma_unidad: true, puestos: ['masero'], tiene_pin: false }]
  A.estado.asignar = { personaId: null, busqueda: '', digitos: '', primero: null, error: null, enviando: false }
  A.pintarAsignarPin()
  chk('7. Asignar PIN sin persona: sin ventana', A.__doc.getElementById('pr-asignar-panel').hidden === true && A.__doc.getElementById('pr-asignar-fondo').hidden === true)
  A.estado.asignar.personaId = 'e-ana'
  A.pintarAsignarPin()
  chk('7. Asignar PIN con persona: la ventana, el fondo y a quién', A.__doc.getElementById('pr-asignar-panel').hidden === false &&
    A.__doc.getElementById('pr-asignar-fondo').hidden === false && A.__doc.getElementById('pr-asignar-quien').textContent === 'Asignar PIN a Ana Masera')
  chk('7. … con su "Cancelar" y el fondo que cierra', /getElementById\('pr-asignar-cancelar'\)\.addEventListener\('click', volverAsignarPin\)/.test(FUENTE) &&
    /getElementById\('pr-asignar-fondo'\)\.addEventListener\('click', volverAsignarPin\)/.test(FUENTE))
})())

// ── 11. Lo producido: tocar una opción avanza sola ───────────────────────
esperas.push((async () => {
  const S = armar()
  S.abrirAgregar()
  chk('11. arranca en el producto', S.estado.agregar.paso === 'producto')
  const p1 = html(S, 'pr-agregar-panel')
  chk('11. la familia chica arriba y el tamaño grande', /<span class="pr-ag__familia">Cucuruchón<\/span><span class="pr-ag__tamano">Mini<\/span>/.test(p1), p1)
  chk('11. "Cono dulce 35 x4": familia "Cono dulce", tamaño "35 x4"', /<span class="pr-ag__familia">Cono dulce<\/span><span class="pr-ag__tamano">35 x4<\/span>/.test(p1), p1)
  // Planta v2: "COMUNES" y, en su propio grupo, "DE CHOCOLATE".
  const iChoco = p1.indexOf('<span class="pr-ag__rotulo">DE CHOCOLATE</span>')
  chk('11. primero los comunes y después, separados, los de chocolate', iChoco > 0 && p1.indexOf('p-cono') < iChoco && iChoco < p1.indexOf('p-choco'), p1)
  // El color del chocolate: un marrón (tono 50–60, poco saturado) de fondo
  // en TODA la etiqueta, con la letra blanca.
  const choco = (p1.match(/<button type="button" class="pr-ag__producto pr-ag__producto--choco" data-ag-producto="p-choco"[^>]*style="background: ([^"]+)">/) || [])[1] ?? ''
  const oklch = /^oklch\(([\d.]+) ([\d.]+) (\d+)\)$/.exec(choco)
  chk('11. el de chocolate con la etiqueta ENTERA en marrón', !!oklch && Number(oklch[3]) >= 45 && Number(oklch[3]) <= 65 && Number(oklch[2]) <= 0.1 && Number(oklch[1]) <= 0.55 &&
    /\.pr-ag__producto--choco \{ color: #fff;/.test(FUENTE), choco)
  chk('11. partesNombreProducto: una palabra es toda tamaño', JSON.stringify(S.partesNombreProducto('Soft')) === '{"familia":"","tamano":"Soft"}' &&
    JSON.stringify(S.partesNombreProducto('Cucuruchón Grande Chocolate')) === '{"familia":"Cucuruchón","tamano":"Grande"}')
  // Planta v2: Producto → Cono → Presentación → (Caja) → Cajas. El cono va
  // en su columna, con "Sin cono" blanco y cada cono de su color.
  S.elegirProductoAgregar('p-mini')
  chk('11. tocar el producto pasa solo al cono (la columna del cono, sola)', S.estado.agregar.paso === 'cono' &&
    S.__doc.getElementById('pr-agregar-cono').hidden === false && S.__doc.getElementById('pr-agregar-panel').hidden === true &&
    S.__doc.getElementById('pr-agregar-cajas-panel').hidden === true)
  const conos = html(S, 'pr-agregar-marcas')
  chk('11. cada cono de su color y "Sin cono" blanco', /<button type="button" class="pr-cono" data-marca="mk-fabri" aria-pressed="false" style="background: oklch\([^"]+; color: oklch\([^"]+; border-color: oklch\(/.test(conos) &&
    /id="pr-agregar-sin-cono" data-ag-cono="0"/.test(FUENTE) && /\.pr-ag__sin-cono \{[^}]*background: #fff;/.test(FUENTE), conos)
  S.elegirCono('mk-fabri')
  chk('11. elegir el cono pasa solo a la presentación', S.estado.agregar.paso === 'presentacion' && S.__doc.getElementById('pr-agregar-cono').hidden === true)
  S.elegirPresentacionAgregar('pr-con')
  chk('11. con dos cajas y ninguna de la unidad, pasa sola a la caja', S.estado.agregar.paso === 'caja')
  chk('11. sin caja elegida no hay "Seguir con las cajas" (tocar una caja ya avanza)', !/data-ag-seguir/.test(S.htmlPasoCaja(S.estado.agregar, S.estado.catalogo)))
  S.elegirCaja('c-dp')
  chk('11. tocar una caja la ELIGE Y PASA SOLA a las cajas', S.estado.agregar.paso === 'cajas' && S.estado.agregar.cajaId === 'c-dp' &&
    S.__doc.getElementById('pr-agregar-cajas-panel').hidden === false && S.__doc.getElementById('pr-agregar-panel').hidden === true &&
    S.__doc.getElementById('pr-agregar-cono').hidden === true)
  // Al lado de las cajas, la caja y el embolsado en UNA línea; tocarla vuelve
  // al paso de la caja, donde se cambia el embolsado.
  chk('11. al lado de las cajas, la caja y el embolsado en una línea', /<button type="button" class="pr-ag__caja" data-paso-ag="caja"><span>Caja N°1 Dolce Pasta · bolsitas individuales<\/span>/.test(html(S, 'pr-agregar-empaque')), html(S, 'pr-agregar-empaque'))
  const pasoCaja = S.htmlPasoCaja(S.estado.agregar, S.estado.catalogo)
  chk('11. el embolsado se cambia en el paso de la caja, con "Seguir con las cajas"', /data-ag-embolsado="individual" aria-pressed="true"/.test(pasoCaja) && /data-ag-seguir/.test(pasoCaja), pasoCaja)
  chk('11. la lista de conos es la única que scrollea, en su recuadro', /id="pr-agregar-marcas" data-scroll-propio/.test(FUENTE) &&
    /\.pr-ag__conos \{ flex: 1; min-height: 0; overflow: auto;/.test(FUENTE))
})())

// ── 12. Corregir TODO un renglón ─────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.abrirCorregir('it-1', 'corregir')
  const a = S.estado.agregar
  chk('12. corregir abre los pasos de la carga, con lo que ya estaba', a && a.corrige?.id === 'it-1' && a.presentacionId === 'pr-con' &&
    a.marcaId === 'mk-fabri' && a.cajaId === 'c-nuss' && a.cajas === 25 && a.paso === 'cajas' && S.estado.vista === 'pr-agregar-prod')
  chk('12. el título dice qué sublote', S.__doc.getElementById('pr-agregar-titulo').textContent === 'Corregir el sublote 7037-1')
  chk('12. el motivo aparece solo al corregir', S.__doc.getElementById('pr-agregar-campo-motivo').hidden === false)
  chk('12. el botón dice "Guardar la corrección"', S.__doc.getElementById('pr-agregar-confirmar').textContent === 'Guardar la corrección')
  chk('12. el panel viejo de solo cajas no se abre', S.__doc.getElementById('pr-corregir').hidden === true)
  await S.confirmarAgregar()
  chk('12. sin motivo no se manda', rpcs(S, 'corregir_produccion_item_completo').length === 0 &&
    /tres letras/.test(S.__doc.getElementById('pr-agregar-error').textContent))
  S.__doc.getElementById('pr-agregar-motivo').value = '  Era otro cono  '
  await S.confirmarAgregar()
  chk('12. sin cambiar nada no se manda', rpcs(S, 'corregir_produccion_item_completo').length === 0 &&
    /No cambiaste nada/.test(S.__doc.getElementById('pr-agregar-error').textContent))
  S.estado.agregar.marcaId = 'mk-cas'
  S.estado.agregar.cajas = 30
  await S.confirmarAgregar()
  const r = rpcs(S, 'corregir_produccion_item_completo')[0]?.[1]
  chk('12. manda SOLO lo que cambió, con el motivo recortado',
    JSON.stringify(r) === '{"p_item_id":"it-1","p_datos":{"marca_id":"mk-cas","cajas":30},"p_motivo":"Era otro cono"}', JSON.stringify(r))
  chk('12. y vuelve a la planilla', S.estado.vista === 'pr-planilla' && S.estado.agregar === null)
  chk('12. no usa la RPC vieja de solo cajas', rpcs(S, 'corregir_produccion_item').length === 0)

  // Pasar a "sin cono": el cono viaja en null, y la caja y el embolsado si cambian.
  const T = armar()
  T.abrirCorregir('it-1', 'corregir')
  T.estado.agregar.conCono = false
  T.estado.agregar.presentacionId = 'pr-sin'
  T.estado.agregar.embolsado = 'grande'
  const d = T.datosCorregirCompleto(T.estado.agregar)
  chk('12. a sin cono: presentación y cono en null', d.presentacion_id === 'pr-sin' && d.marca_id === null && !('cajas' in d) && !('caja_insumo_id' in d), JSON.stringify(d))
  T.estado.agregar.cajaId = 'c-dp'
  chk('12. la caja y el embolsado cuando cambian', T.datosCorregirCompleto({ ...T.estado.agregar, presentacionId: 'pr-con', conCono: true, marcaId: 'mk-fabri', embolsado: 'individual' }).caja_insumo_id === 'c-dp' &&
    T.datosCorregirCompleto({ ...T.estado.agregar, presentacionId: 'pr-con', conCono: true, marcaId: 'mk-fabri', embolsado: 'individual' }).embolsado === 'individual')
  chk('12. sin empaque legible no se tocan ni la caja ni el embolsado', (() => {
    const d2 = T.datosCorregirCompleto({ ...T.estado.agregar, presentacionId: 'pr-con', conCono: true, marcaId: 'mk-fabri' }, { ...CAT, empaqueError: true })
    return !('caja_insumo_id' in d2) && !('embolsado' in d2)
  })())
  // El error de la base, tal cual.
  const E = armar()
  E.__setRpc(async (n) => n === 'corregir_produccion_item_completo' ? { data: null, error: { message: 'Esa caja no corresponde a la presentación elegida.' } } : { data: null, error: null })
  E.abrirCorregir('it-1', 'corregir')
  E.__doc.getElementById('pr-agregar-motivo').value = 'motivo'
  E.estado.agregar.cajas = 26
  await E.confirmarAgregar()
  chk('12. el error de la base se muestra tal cual', E.__doc.getElementById('pr-agregar-error').textContent === 'Esa caja no corresponde a la presentación elegida.')
  // Agregar (no corregir) sigue igual.
  const G = armar()
  G.abrirAgregar()
  chk('12. agregar no pide motivo', G.__doc.getElementById('pr-agregar-campo-motivo').hidden === true &&
    G.__doc.getElementById('pr-agregar-titulo').textContent === 'Agregar producto')
})())

// ── 13. El renglón en una línea, con "Anular" ────────────────────────────
esperas.push((async () => {
  const S = armar()
  const h = S.htmlProducido({ ...ITEM }, CAT, CAT.insumos)
  // Planta v2: el renglón es una fila de la tabla de lo producido
  // (sublote · producto · cono · caja y bolsa · cajas · unidades · botones),
  // con el texto entero en el title.
  chk('13. una sola fila: sublote, producto, cono y caja, con el texto entero en el title',
    /^<div class="pr-fila-prod" title="Cucuruchón Mini · con cono · FABRI · [^"]*">/.test(h) &&
    /<span class="pr-fp__sub">7037-1<\/span><span class="pr-fp__prod">[\s\S]*?Cucuruchón Mini<\/span><\/span><\/span><span class="pr-fp__l2"><span class="pr-fp__cono"><span class="pr-cono-chip"[^>]*>FABRI<\/span><\/span><span class="pr-fp__caja">Caja N°1 Nuss · bolsa grande<\/span>/.test(h), h)
  chk('13. el botón dice "Anular", no "Borrar"', /data-borrar="it-1" title="Anular" aria-label="Anular el sublote 7037-1"/.test(h) && !/Borrar/.test(h), h)
  chk('13. la fila no se parte (apaisada): las partes van en las columnas de la misma grilla que el encabezado',
    /\.pr-prod__thead, \.pr-fila-prod \{\s*display: grid; grid-template-columns: 70px [^;]+;/.test(FUENTE) &&
    /\.pr-fp__l1, \.pr-fp__l2, \.pr-fp__num \{ display: contents; \}/.test(FUENTE))
  const sc = S.htmlProducido({ ...ITEM, caja_insumo_id: null, embolsado: 'grande' }, CAT, CAT.insumos)
  chk('13. sin empaque: etiqueta corta en la misma línea, el texto entero en el title', /pr-sin-caja pr-sin-caja--chip" title="Sin empaque descontado/.test(sc) && />sin empaque<\/span>/.test(sc), sc)
  S.abrirCorregir('it-1', 'anular')
  chk('13. anular: el panel dice "Anular el sublote"', S.__doc.getElementById('pr-corregir-titulo').textContent === 'Anular el sublote 7037-1' &&
    S.__doc.getElementById('pr-corregir-confirmar').textContent === 'Anularlo')
})())

// ── 9, 14, 16. La receta, las paradas y el reloj ─────────────────────────
esperas.push((async () => {
  // Planta v2: un segmentado (.pr-seg-rec, flex sin wrap) con los tres.
  {
    const ops = require('./extraer').extraerFn(FUENTE, 'htmlOpcionesReceta')
    chk('9. Original / Anterior / Modificar: tres botones chicos en UNA fila',
      /const comos = '<span class="pr-seg-rec pr-receta__comos" role="group"[^']*' \+\s*htmlComo\('original'[\s\S]*?htmlComo\('anterior'[\s\S]*?htmlComo\('modificar'[\s\S]*?'<\/span>'/.test(ops) &&
      /\.pr-seg-rec \{ display: flex;/.test(FUENTE) && !/\.pr-seg-rec[^{]*\{[^}]*flex-wrap: wrap/.test(FUENTE) &&
      /\.pr-seg-rec__op, \.pr-como \{[^}]*white-space: nowrap;/.test(FUENTE))
  }
  chk('9. sin la pastilla aparte del origen', !/class="pr-chip-origen/.test(FUENTE.slice(FUENTE.indexOf('function htmlCabeceraReceta'), FUENTE.indexOf('function htmlCabeceraReceta') + 1500)))
  // Planta v2: la receta es una grilla de 4 columnas por renglón en TODOS
  // los tamaños: ningún @media la apila.
  chk('9. la receta: una fila por ingrediente, en cualquier ancho',
    /\.pr-rec, \.pr-rec--cab \{\s*display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.1fr\) minmax\(0, 1\.25fr\) 64px;/.test(FUENTE) &&
    !/\.pr-rec[ ,{][^}]*(grid-template-columns: (minmax\(0, 1fr\)|1fr);|display: (block|flex))/.test(FUENTE.replace(/\.pr-rec, \.pr-rec--cab \{[^}]*\}/, '')))
  // Planta v2: las paradas en bordó con los tokens nuevos (--p-mal).
  chk('14. "Paró ahora" en bordó', /class="pr-prim pr-prim--mal" id="pr-btn-parada"/.test(FUENTE) && /\.pr-prim--mal \{ background: var\(--p-mal\); \}/.test(FUENTE))
  chk('14. la tarjeta de paradas en bordó', /\.pr-parada-activa \{ background: var\(--p-mal\); color: #fff;/.test(FUENTE) &&
    /\.pr-paradas__cab \{[^}]*color: var\(--p-mal\);/.test(FUENTE) && /\.pr-parada-item--curso \{ background: var\(--p-mal-suave\);/.test(FUENTE))

  const S = armar()
  chk('16. el reloj: "28/09/2026 · 12:37" en hora argentina', S.textoReloj(new Date('2026-09-28T15:37:10Z')) === '28/09/2026 · 12:37', S.textoReloj(new Date('2026-09-28T15:37:10Z')))
  chk('16. medianoche es 00, no 24', S.textoReloj(new Date('2026-09-29T03:05:00Z')) === '29/09/2026 · 00:05', S.textoReloj(new Date('2026-09-29T03:05:00Z')))
  chk('16. una fecha rota no dibuja nada', S.textoReloj(new Date('x')) === '' && S.textoReloj(null) === '')
  // Se actualiza solo: tocarReloj reescribe TODOS los [data-reloj].
  const relojes = [{ textContent: 'viejo' }, { textContent: 'viejo' }]
  const qsa = S.__doc.querySelectorAll
  S.__doc.querySelectorAll = (sel) => sel === '[data-reloj]' ? relojes : []
  S.tocarReloj(new Date('2026-09-28T15:38:00Z'))
  chk('16. se actualiza solo, en cada lugar donde está', relojes.every(r => r.textContent === '28/09/2026 · 12:38'))
  S.__doc.querySelectorAll = qsa
  chk('16. un solo reloj por página', S.iniciarReloj() === true && S.iniciarReloj() === false)
  chk('16. cada minuto, al minuto justo', /relojPlanta = setTimeout\(\(\) => \{ tocarReloj\(\); relojPlanta = setInterval\(tocarReloj, 60000\) \}, falta \+ 50\)/.test(FUENTE))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  // Planta v2: en la barra lateral va en dos líneas (la tablet parada) y,
  // apaisada, en la cabecera de cada pantalla.
  const relojLat = /class="pr-lat__reloj" aria-label="Fecha y hora"><span class="pr-reloj-hora" data-reloj-hora>/
  chk('16. en la barra lateral (los dos modos)', relojLat.test(S.htmlLateral()))
  S.estado.modo = 'masa'
  chk('16. … también en Sala de masa', relojLat.test(S.htmlLateral()))
  chk('16. y en la cabecera de cada pantalla', /<span class="pr-reloj pr-cab__reloj" data-reloj aria-label="Fecha y hora"><\/span>/.test(FUENTE))
  // tocarReloj también actualiza el reloj de dos líneas.
  {
    const hora = { textContent: '' }, fecha = { textContent: '' }
    const qsa2 = S.__doc.querySelectorAll
    S.__doc.querySelectorAll = (sel) => sel === '[data-reloj-hora]' ? [hora] : sel === '[data-reloj-fecha]' ? [fecha] : []
    S.tocarReloj(new Date('2026-09-28T15:38:00Z'))
    S.__doc.querySelectorAll = qsa2
    chk('16. el reloj de dos líneas también se actualiza', hora.textContent === '12:38' && fecha.textContent === '28/09/2026', JSON.stringify([hora, fecha]))
  }
  S.estado.modo = 'produccion'
  chk('16. y en "¿Quién sos?"', /class="pr-reloj pr-banda-modo__reloj" data-reloj/.test(S.htmlBandaQuien()))
  chk('16. arranca con la planta', /iniciarReloj\(\)\s+registrarPantalla\(\)/.test(FUENTE))
})())

// ── Todo entra sin scroll (1000×540 apaisada, 600×940 parada) ────────────
// Planta v2 (CSS nuevo, tokens --p-*): la página NO scrollea —el marco mide
// 100dvh y esconde lo que sobra— y las listas largas scrollean adentro de su
// recuadro (data-scroll-propio). Parada, la barra va arriba (columna). Las
// medidas reales las hace e2e/8-planta-tamanos.spec.js; esto fija las reglas.
{
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  chk('sin scroll: el body esconde lo que sobra', /\n    body, body\.pagina-modulo \{[^}]*overflow: hidden;/.test(css))
  chk('… el marco mide el alto de la pantalla y no crece', /\.pr-app \{ height: 100dvh; display: flex; flex-direction: row; overflow: hidden; \}/.test(css))
  chk('… parada, la barra va arriba', /@media \(orientation: portrait\) \{ \.pr-app \{ flex-direction: column; \} \}/.test(css))
  chk('… cada pantalla llena el resto sin empujar', /#pr-vista > section \{ flex: 1; min-height: 0; min-width: 0;/.test(css))
  chk('… y lo que scrollea, scrollea en su recuadro', /\[data-scroll-propio\] \{ overflow-y: auto; min-height: 0;/.test(css))
  chk('… sin anchos ni altos fijos en px del marco (solo 100dvh)', !/\.pr-app \{[^}]*height: \d+px/.test(css))
  const listas = ['pr-acceso-personas', 'pr-asignar-personas', 'pr-planilla-producido', 'pr-planilla-operarios', 'pr-agregar-marcas',
    'pr-planilla-paradas', 'pr-cierre-falta', 'pr-receta-filas', 'pr-hm-lista', 'pr-hm-detalle', 'pr-cerrado-lista']
  const sin = listas.filter(id => !new RegExp(`id="${id}"[^>]*data-scroll-propio`).test(FUENTE))
  chk('las listas largas scrollean en su recuadro (data-scroll-propio)', sin.length === 0, sin.join(', '))
  chk('… también las que se arman en JS (operarios de Abrir turno, lotes)', /class="pr-abrir-ops__lista pr-op-tags" data-res-op="\$\{i\}" data-scroll-propio/.test(FUENTE) &&
    /<div class="pr-lp__filas" data-scroll-propio>/.test(FUENTE))
}

// ── HTML malicioso en cada render nuevo ──────────────────────────────────
esperas.push((async () => {
  const X = armar()
  // Las etiquetas de operarios.
  const ops = [{ id: marca('opId'), nombre: marca('operario'), puestos: ['operario'] }]
  const form = { filas: [{ nombre: marca('maquina'), elegida: true, bloqueada: false, operarios: [], busqueda: '' },
    { nombre: marca('otra'), elegida: true, bloqueada: false, operarios: [marca('opId')], busqueda: '' }] }
  chequearMarcas(chk, 'etiquetas de operarios', X.htmlTagsOperarios(form.filas[0], 0, ops, form), ['opId', 'operario', 'otra'])
  // Planta v2: la máquina es un botón (htmlFilaAbrir) y sus operarios van en
  // la tarjeta de al lado (htmlOperariosAbrir).
  chequearMarcas(chk, 'la fila de Abrir turno', X.htmlFilaAbrir(form.filas[0], 0, ops, form), ['maquina'])
  chequearMarcas(chk, 'la máquina abierta de ayer', X.htmlFilaAbrir({ ...form.filas[0], bloqueada: true, lote: marca('lote') }, 0, ops, form), ['maquina', 'lote'])
  // Con recientes: "TRABAJARON HACE POCO EN <MÁQUINA>" lleva el nombre de la
  // máquina EN MAYÚSCULAS (la marca cruda sería "<B DATA-XSS=").
  const conRecientes = X.htmlTagsOperarios({ ...form.filas[0], maquinaId: 'm-x' }, 0, ops, { ...form, recientes: new Map([['m-x', new Set([marca('opId')])]]) })
  chk('etiquetas con recientes: el nombre de la máquina escapado (en mayúsculas)', !/<b data-xss=/i.test(conRecientes) &&
    conRecientes.includes('TRABAJARON HACE POCO EN &quot;&gt;&lt;B DATA-XSS=&quot;MAQUINA&quot;&gt;'), conRecientes)
  form.filas[0].busqueda = marca('busqueda')
  chequearMarcas(chk, 'etiquetas buscando algo raro', X.htmlTagsOperarios(form.filas[0], 0, ops, form), ['busqueda'])
  const opsAbrir = X.htmlOperariosAbrir({ ...form, editando: 0 }, ops)
  chequearMarcas(chk, 'los operarios de la máquina', opsAbrir, ['maquina', 'busqueda'])
  // El título lleva el nombre de la máquina EN MAYÚSCULAS: una marca cruda
  // ahí sería "<B DATA-XSS=", que la comparación de siempre no ve.
  chk('los operarios de la máquina: tampoco una marca cruda en mayúsculas', !/<b data-xss=/i.test(opsAbrir), opsAbrir)
  // Un renglón de lote.
  const fila = { o: { insumo_id: 'x', lote: marca('lote'), sinLote: false, stock: 5 }, i: 0, marca: marca('marca'), desde: '2026-09-01', queda: 5 }
  chequearMarcas(chk, 'renglón de lote', X.htmlFilaLote(fila, true, true), ['lote', 'marca'])
  // El producto partido en familia y tamaño.
  chequearMarcas(chk, 'producto (familia y tamaño)', X.htmlPasoProducto({ ...CAT, productos: [{ id: 'p', nombre: `Fam ${marca('tam')}`, tipo_masa: 'Común' }] }), ['tam'])
  // El renglón de lo producido (con el title).
  const catMalo = { ...CAT, productos: [{ id: 'p-mini', nombre: marca('producto'), tipo_masa: 'Común' }], marcas: [{ id: 'mk-fabri', nombre: marca('cono') }] }
  chequearMarcas(chk, 'renglón producido en una línea', X.htmlProducido({ ...ITEM, sublote: marca('sublote') }, catMalo, CAT.insumos), ['producto', 'cono', 'sublote'])
  chequearMarcas(chk, 'renglón producido sin empaque', X.htmlProducido({ ...ITEM, caja_insumo_id: null }, catMalo, CAT.insumos), ['producto', 'cono'])
  // El reloj no toma datos de afuera, pero pasa por esc().
  chk('el reloj pasa por esc()', /<span class="pr-reloj \$\{clase\}" data-reloj aria-label="Fecha y hora">\$\{esc\(textoReloj\(\)\)\}<\/span>/.test(FUENTE))
})())

fin()
