// SALA DE MASA — TIRAR una masa (30/09/2026, pedido de Facu).
//
//   ANULAR = se registró de más: el stock vuelve.
//   TIRAR  = se hizo y se tiró: lo que se usó QUEDA descontado del stock.
//
// La base ya está (verificado con pg_get_functiondef el 30/09/2026):
// `masas.descartada` / `descarte_motivo` y `tirar_masa(p_masa_id, p_motivo)`
// → void, que exige el motivo con 5 letras o más (su mensaje trae ejemplos) y
// no toca el stock. `_chequear_masa_chocolate` y `_chocolate_sin_masa` ya
// ignoran las tiradas; `indicadores_produccion`, `_masa_anterior` y
// `anular_masa` NO las miran (se reporta, no se toca).
//
// Lo que exige esta suite:
//  · La planta: al lado de "Anular la última masa", "Tirar la última masa" en
//    bordó; su panel pide el motivo (obligatorio, con ejemplos), dice "La
//    masa se tira: lo que se usó queda descontado del stock", manda una sola
//    vez y muestra el error de la base TAL CUAL. En las listas, la tirada va
//    tachada con "Tirada" y su motivo, no suma en la cuenta de masas y no se
//    puede anular. El número estimado de la próxima la sigue contando (la
//    base numera con max(nro)+1).
//  · La gestión: la tarjeta "Masas tiradas" de los indicadores, con datos
//    propios (cuántas en la semana contra la anterior, por máquina, por motivo
//    y los kilos de materia prima perdidos) que falla sola.
//
//   node pruebas/test-produccion-tirar.js

process.env.TZ = 'UTC'

const path = require('path')
const { execSync } = require('child_process')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE = leer(ARCHIVO)
const FUENTE_G = leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()

// Baseline FIJO: el commit anterior al cambio (el botón "Anterior (última)").
const BASE = 'ae653a3'
const RAIZ = path.join(__dirname, '..')
function enBase(ruta) {
  try { return execSync(`git show ${BASE}:${ruta}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) } catch { return null }
}
const baseP = enBase('modulos/produccion.html'), baseG = enBase('modulos/produccion-gestion.html')
chk('baseline: en el commit anterior no existía tirar_masa en la planta ni la tarjeta en la gestión',
  baseP !== null && !baseP.includes('tirar_masa') && baseG !== null && !baseG.includes('renderTiradas'))

const M = (nro, extra = {}) => ({ id: `m${nro}`, turno_id: 't1', nro, hora: `2026-09-30T1${nro % 10}:00:00Z`, tipo_masa: 'Común', doble: false,
  origen: 'original', es_chocolate: false, anulada: false, anulada_motivo: null, descartada: false, descarte_motivo: null, masero_id: 'e-mas', ...extra })

function planta(masas, rpc) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.salaTurno = { id: 't1', lote: 7023, turno: 'Mañana', maquinaId: 'm-1', maquinaNombre: 'Máquina 1', nro: 9 }
  S.estado.masasReceta = masas
  Object.assign(S.__tablas, { masas: () => ({ data: S.estado.__masasDeLaBase ?? masas, error: null }) })
  if (rpc) S.__setRpc(rpc)
  return S
}
const htmlCol = (S) => S.__doc.getElementById('pr-receta-masas').innerHTML
const sinEtiquetas = (h) => String(h).replace(/<[^>]*>/g, '')

esperas.push((async () => {
  // ── Las lecturas traen si la masa se tiró ─────────────────────────────
  chk('las masas de la sala se leen con descartada y descarte_motivo',
    /\.select\('id, turno_id, nro, hora, tipo_masa, doble, origen, es_chocolate, anulada, anulada_motivo, descartada, descarte_motivo, masero_id, motivo, receta_id'\)/.test(FUENTE))
  chk('el tablero lee descartada de las masas (para no contarlas)', /from\('masas'\)\.select\('turno_id, hora, descartada'\)/.test(FUENTE))
  chk('la planilla lee descartada y su motivo', /\.select\('id, nro, hora, doble, origen, es_chocolate, masero_id, descartada, descarte_motivo'\)\.eq\('turno_id', turnoId\)/.test(FUENTE))

  // ── Funciones puras ───────────────────────────────────────────────────
  const X = construirProduccion(ARCHIVO)
  chk('esTirada: solo con descartada === true', X.esTirada({ descartada: true }) && !X.esTirada({ descartada: false }) && !X.esTirada({}) && !X.esTirada(null) && !X.esTirada({ descartada: 'true' }))
  const lista = [M(1), M(2), M(3, { descartada: true, descarte_motivo: 'se cortó la luz' })]
  chk('la última que se puede anular o tirar saltea la tirada', X.ultimaMasaAnulable(lista)?.id === 'm2', X.ultimaMasaAnulable(lista)?.id)
  chk('… y la anulada', X.ultimaMasaAnulable([M(1), M(2, { anulada: true }), M(3, { descartada: true })])?.id === 'm1')
  chk('… y si todas se tiraron, no hay ninguna', X.ultimaMasaAnulable([M(1, { descartada: true })]) === null)

  // ── La fila de la columna MASAS DEL TURNO ─────────────────────────────
  const fila = X.htmlMasaReceta(M(3, { descartada: true, descarte_motivo: 'se puso el triple de azúcar', es_chocolate: true, origen: 'modificada' }))
  chk('fila tirada: va tachada (clase pr-rm__fila--tirada)', /class="pr-rm__fila pr-rm__fila--tirada"/.test(fila), fila)
  chk('fila tirada: dice "Tirada" y su motivo', /Tirada: <span class="pr-tirada__motivo">se puso el triple de azúcar<\/span>/.test(fila), fila)
  chk('fila tirada: sin los chips de la masa (Modificada / Chocolate)', !/pr-chip-modificada|pr-chip-choco/.test(fila))
  const anulada = X.htmlMasaReceta(M(2, { anulada: true, descartada: true }))
  chk('una anulada sigue diciendo "Anulada" (anular gana)', /Anulada/.test(anulada) && !/Tirada/.test(anulada) && !/--tirada/.test(anulada))
  const normal = X.htmlMasaReceta(M(1))
  chk('una normal no dice "Tirada"', !/Tirada|--tirada/.test(normal))
  chequearMarcas(chk, 'fila tirada con motivo malicioso', X.htmlMasaReceta(M(4, { descartada: true, descarte_motivo: marca('motivo') })), ['motivo'])
  const SX = planta([M(1)])
  SX.estado.tirarUltima = { masaId: 'm1', motivo: '', error: null }
  chequearMarcas(chk, 'panel de tirar con número malicioso', SX.htmlTirarUltima(M(1, { nro: marca('nro') })), ['nro'])
  chk('htmlTirada sin motivo: "Tirada" a secas', X.htmlTirada({ descartada: true }) === '<span class="pr-tirada">Tirada</span>')

  // ── La columna: cuenta y botones ──────────────────────────────────────
  const S = planta([M(1), M(2), M(3, { descartada: true, descarte_motivo: 'se cortó la luz' })])
  S.pintarMasasReceta()
  let h = htmlCol(S)
  chk('la cuenta de masas no suma la tirada (3 → 2)', /<span class="pr-rm__cuenta">2<\/span>/.test(h), (h.match(/pr-rm__cuenta">[^<]*/) || [''])[0])
  chk('al lado de "Anular la última masa", "Tirar la última masa"',
    /data-anular-ultima="1">Anular la última masa<\/button><button type="button" class="pr-btn pr-btn--tirar pr-rm__anular-btn" data-tirar-ultima="1">Tirar la última masa<\/button>/.test(h))
  chk('… los dos juntos en una fila que se acomoda (pr-rm__acciones)', /<div class="pr-rm__acciones"><button[^>]*data-anular-ultima/.test(h))
  chk('el botón de tirar va en bordó: .pr-btn--tirar con borde y letra bordó', /\.pr-btn--tirar \{[^}]*border-color: var\(--p-mal\);[^}]*color: var\(--p-mal-txt\)/.test(FUENTE))
  chk('CSS: se tachan el número y el detalle de la tirada, no la etiqueta',
    /\.pr-rm__fila--tirada \.pr-rm__nro, \.pr-rm__fila--tirada \.pr-rm__det \{ text-decoration: line-through;/.test(FUENTE) && !/\.pr-rm__fila--tirada \{[^}]*line-through/.test(FUENTE))

  // Pedir tirar: se abre el panel de la última que se puede tirar (la 2).
  S.estado.anularUltima = { masaId: 'm2', motivo: 'x', error: null }
  S.pedirTirarUltima()
  chk('pedir tirar: el panel es de la última que se puede tirar (la 2, no la tirada 3)', S.estado.tirarUltima?.masaId === 'm2', JSON.stringify(S.estado.tirarUltima))
  chk('… y cierra el panel de anular', S.estado.anularUltima === null)
  h = htmlCol(S)
  chk('el panel dice claro qué pasa con el stock', /La masa se tira: lo que se usó queda descontado del stock\./.test(h))
  chk('… y da ejemplos del motivo', /se puso el triple de azúcar/.test(h) && /se cortó la luz/.test(h))
  chk('… con el campo del motivo y "Tirar masa 2"', /id="pr-rm-tirar-motivo"/.test(h) && /id="pr-rm-tirar-confirmar">Tirar masa 2<\/button>/.test(h))
  chk('… el campo del motivo no se autocompleta', /id="pr-rm-tirar-motivo" class="pr-input" maxlength="300" autocomplete="off"/.test(h))
  chk('… y los botones de abajo ya no están (el panel los reemplaza)', !/data-tirar-ultima/.test(h))
  chk('mientras se tira, el centro queda atenuado (igual que al anular)', /centro\.classList\.toggle\('pr-receta-centro--atenuado', !!estado\.anularUltima \|\| !!estado\.tirarUltima\)/.test(FUENTE))
  S.pedirAnularUltima()
  chk('pedir anular cierra el panel de tirar', S.estado.tirarUltima === null && S.estado.anularUltima?.masaId === 'm2')
  S.pedirTirarUltima()
  S.cancelarTirarUltima()
  chk('cancelar cierra el panel y vuelven los dos botones', S.estado.tirarUltima === null && /data-tirar-ultima="1"/.test(htmlCol(S)))

  // Sin motivo: no se llama a la base.
  S.pedirTirarUltima()
  S.estado.tirarUltima.motivo = '   '
  await S.confirmarTirarUltima()
  chk('sin motivo no se manda nada y se dice que es obligatorio', !S.__llamadas.rpc.some(l => l[0] === 'tirar_masa') &&
    /Contá por qué se tiró: es obligatorio\./.test(htmlCol(S)) && S.__doc.getElementById('pr-rm-tirar-error').hidden !== true)

  // Con motivo corto: va a la base y su mensaje se muestra TAL CUAL.
  const MSJ = 'Contá por qué se tiró (por ejemplo: "se puso el triple de azúcar", "se cortó la luz").'
  const S2 = planta([M(1), M(2)], async (n) => n === 'tirar_masa' ? { data: null, error: { message: MSJ } } : { data: null, error: null })
  S2.pintarMasasReceta()
  S2.pedirTirarUltima()
  S2.estado.tirarUltima.motivo = '  luz '
  await S2.confirmarTirarUltima()
  const llam = S2.__llamadas.rpc.filter(l => l[0] === 'tirar_masa')
  chk('se llama a tirar_masa con la masa y el motivo sin espacios de los bordes', llam.length === 1 && llam[0][1].p_masa_id === 'm2' && llam[0][1].p_motivo === 'luz', JSON.stringify(llam))
  const hErr = htmlCol(S2)
  chk('el error de la base va TAL CUAL, pegado al botón', hErr.includes('Contá por qué se tiró (por ejemplo: &quot;se puso el triple de azúcar&quot;, &quot;se cortó la luz&quot;).') &&
    /id="pr-rm-tirar-error">/.test(hErr), (hErr.match(/pr-rm-tirar-error[^<]*<?[^<]*/) || [''])[0])
  chk('… el panel sigue abierto y se puede volver a mandar', S2.estado.tirarUltima && S2.estado.tirarUltima.enviando === false)
  chk('… y no se dice que se tiró', !S2.__llamadas.exitos.length)

  // Doble toque: una sola llamada.
  // Se guardan TODOS los que esperan: si una mutación hace que se mande dos
  // veces, soltar() los suelta a todos y la suite no se cuelga.
  const esperando = []
  const soltar = () => { for (const r of esperando.splice(0)) r({ data: null, error: null }) }
  const S3 = planta([M(1), M(2)], (n) => n === 'tirar_masa' ? new Promise(r => { esperando.push(r) }) : Promise.resolve({ data: null, error: null }))
  S3.pintarMasasReceta()
  S3.pedirTirarUltima()
  S3.estado.tirarUltima.motivo = 'se cortó la luz'
  const p1 = S3.confirmarTirarUltima(), p2 = S3.confirmarTirarUltima()
  chk('doble toque: tirar_masa se manda UNA vez', S3.__llamadas.rpc.filter(l => l[0] === 'tirar_masa').length === 1)
  chk('… y el botón queda trabado mientras manda', S3.__doc.getElementById('pr-rm-tirar-confirmar').disabled === true)
  S3.estado.tirarUltima.motivo = 'se cortó la luz'
  S3.pintarMasasReceta()
  chk('al repintar, el motivo escrito sigue en el campo', S3.__doc.getElementById('pr-rm-tirar-motivo').value === 'se cortó la luz')
  chk('… y el botón sigue trabado (enviando)', /id="pr-rm-tirar-confirmar" disabled>/.test(htmlCol(S3)))
  S3.estado.__masasDeLaBase = [M(1), M(2, { descartada: true, descarte_motivo: 'se cortó la luz' })]
  soltar()
  await Promise.all([p1, p2])
  chk('salió bien: lo dice, con la consecuencia', S3.__llamadas.exitos.includes('Masa tirada: lo que se usó queda descontado del stock.'), JSON.stringify(S3.__llamadas.exitos))
  chk('… el panel se cierra y se vuelven a leer las masas', S3.estado.tirarUltima === null && S3.estado.masasReceta?.some(m => m.id === 'm2' && m.descartada))
  const hOk = htmlCol(S3)
  chk('… y la 2 aparece tirada, con su motivo, y la cuenta baja a 1', /pr-rm__fila--tirada/.test(hOk) && /se cortó la luz/.test(hOk) && /pr-rm__cuenta">1</.test(hOk))
  chk('… y ahora se puede tirar o anular la 1', /data-tirar-ultima/.test(hOk) && S3.ultimaMasaAnulable(S3.estado.masasReceta)?.id === 'm1')

  // Sin produccion:cargar no hay botones.
  const S4 = planta([M(1)])
  S4.estado.misTareas = new Map([['ver', { todas: true }]])
  S4.pintarMasasReceta()
  chk('sin produccion:cargar no se ofrece tirar ni anular', !/data-tirar-ultima|data-anular-ultima/.test(htmlCol(S4)))

  // Los eventos.
  chk('los botones están conectados (tirar, cancelar, confirmar y el motivo)',
    /closest\('\[data-tirar-ultima\]'\)\) \{ pedirTirarUltima\(\)/.test(FUENTE) && /closest\('#pr-rm-tirar-cancelar'\)\) \{ cancelarTirarUltima\(\)/.test(FUENTE) &&
    /closest\('#pr-rm-tirar-confirmar'\)\) \{ confirmarTirarUltima\(\)/.test(FUENTE) &&
    /ev\.target\.id === 'pr-rm-tirar-motivo' && estado\.tirarUltima\) estado\.tirarUltima\.motivo = ev\.target\.value/.test(FUENTE))
  chk('mostrar la receta cierra el panel de tirar', /estado\.anularUltima = null\n\s+estado\.tirarUltima = null/.test(FUENTE))

  // ── Masas del turno (todas las máquinas): sin "Anular" en una tirada ──
  const f1 = X.htmlFilaMasaTurno(M(3, { descartada: true, descarte_motivo: 'se cortó la luz' }), true)
  chk('masas del turno: la tirada va tachada con "Tirada" y su motivo', /pr-masa-fila pr-masa-fila--tirada/.test(f1) && /Tirada: <span class="pr-tirada__motivo">se cortó la luz/.test(f1))
  chk('… y NO ofrece "Anular" (anularla devolvería el stock)', !/data-anular-masa/.test(f1))
  chk('una normal sigue ofreciendo "Anular"', /data-anular-masa="m1"/.test(X.htmlFilaMasaTurno(M(1), true)))
  const S5 = planta([])
  S5.estado.masasTurno = [M(3, { descartada: true })]
  S5.pedirAnularMasa('m3')
  chk('pedir anular una tirada no hace nada', S5.estado.anulando == null)

  // ── El historial de una máquina ───────────────────────────────────────
  const hb = X.htmlMasaHist(M(3, { descartada: true, descarte_motivo: 'se cortó la luz' }), false)
  chk('historial: la tirada tachada (pr-hm__masa--tirada) con "Tirada" y su motivo', /pr-hm__masa pr-hm__masa--tirada/.test(hb) && /Tirada: <span class="pr-tirada__motivo">se cortó la luz/.test(hb))
  const S6 = planta([])
  S6.estado.personal = []
  const hm = { turnoId: 't1', maquinaNombre: 'Máquina 1', lote: 7023, turno: 'Mañana', masas: [M(1), M(2, { descartada: true, descarte_motivo: marca('desc') })],
    error: false, elegida: 'm2', detalle: { masaId: 'm2', items: [], receta: null, error: false }, anular: null }
  S6.estado.histMaq = hm
  const det = S6.htmlDetalleHist(hm)
  chk('detalle: "Se tiró:" con su motivo y que lo usado quedó descontado', /Se tiró:<\/span> .*lo que se usó quedó descontado del stock\./.test(det))
  chequearMarcas(chk, 'detalle de una tirada con motivo malicioso', det, ['desc'])
  chk('detalle: una tirada no ofrece "Anular esta masa"', !/pr-hm-anular/.test(det))
  S6.pintarHistMaq()
  chk('historial: la cuenta del título no suma la tirada', S6.__doc.getElementById('pr-hm-titulo').textContent.endsWith('1 masa'), S6.__doc.getElementById('pr-hm-titulo').textContent)

  // ── El tablero y la sala: la cuenta y el número estimado ──────────────
  const est = X.estadoMaquinas({ maquinas: [{ id: 'm-1', nombre: 'Máquina 1' }], turnos: [{ id: 't1', maquina_id: 'm-1', lote: 7023 }],
    masas: [{ turno_id: 't1', hora: '2026-09-30T10:00:00Z', descartada: false }, { turno_id: 't1', hora: '2026-09-30T11:00:00Z', descartada: true }],
    paradas: [], sublotes: [] })
  chk('tablero: la tirada no suma en la cuenta de masas', est[0].masas === 1, String(est[0].masas))
  chk('… pero sí para estimar el número de la próxima (la base numera con max+1)', est[0].masasHechas === 2)
  chk('el número estimado usa las hechas', /nro: \(e\.masasHechas \?\? e\.masas\) \+ 1/.test(FUENTE))

  // ── La planilla ────────────────────────────────────────────────────────
  const res = sinEtiquetas(X.htmlMasasResumen([M(1), M(2, { descartada: true }), M(3, { descartada: true })]))
  chk('planilla: cuenta solo las que no se tiraron y dice las tiradas aparte', /MASAS1común · 2 tiradas/.test(res), res)
  chk('… con una sola tirada, en singular', /· 1 tirada/.test(sinEtiquetas(X.htmlMasasResumen([M(1), M(2, { descartada: true })]))))
  chk('… sin tiradas no las nombra', !/tirada/.test(sinEtiquetas(X.htmlMasasResumen([M(1)]))))
  chk('una masa de chocolate TIRADA no cuenta como masa de chocolate (como la base)',
    X.hayMasaChocolate({ masas: [M(1, { es_chocolate: true, descartada: true })] }) === false && X.hayMasaChocolate({ masas: [M(1, { es_chocolate: true })] }) === true)
  chk('el resumen del cierre no cuenta las tiradas', /const masas = \(p\?\.masas \?\? \[\]\)\.filter\(m => !esTirada\(m\)\)/.test(FUENTE))

  // ── "Anterior": si se tiró, lo dice ────────────────────────────────────
  const S7 = planta([M(2, { id: 'mA', descartada: true })])
  const dTir = { anterior: { masa_id: 'mA', nro: 2, hora: null, es_chocolate: false, items: [] }, original: { items: [] } }
  chk('Anterior: si la masa anterior se tiró, el detalle corto lo dice en bordó', /<span class="pr-como__choco pr-como__tirada">· tirada<\/span>/.test(S7.detalleAnteriorCorto(dTir)))
  chk('… y el title también', /Esa masa se TIRÓ\./.test(S7.detalleAnterior(dTir)))
  const S8 = planta([M(1, { descartada: true }), M(2, { id: 'mA' })])
  chk('una anterior que no se tiró no dice nada', !/tirada|TIRÓ/.test(S8.detalleAnteriorCorto(dTir) + S8.detalleAnterior(dTir)))
  chk('al leer las masas, si la anterior se tiró se redibujan las opciones', /if \(anteriorFueTirada\(estado\.datosMasa\?\.anterior\)\) repintarOpcionesReceta\(\)/.test(FUENTE))
})())

// ═══ LA GESTIÓN: la tarjeta "Masas tiradas" ════════════════════════════
const DATOS_RPC = {
  fecha: '2026-09-30', ahora: [], cajas_por_producto: [], semana: { desde: '2026-09-24', hasta: '2026-09-30', turnos: 1, cajas: 1, unidades: 1, masas: 3, masas_modificadas: 0, masas_chocolate: 0, scrap_kg: 0, masa_kg: 1, minutos_parada: 0, motivo_parada_mas_comun: null },
  rendimiento_harina: [], scrap_por_lote: [], pendientes: { planillas_por_completar: 0, turnos_abiertos_de_otro_dia: 0, conos_por_revisar: 0 },
}
const TURNOS = [
  { id: 't-a', maquina_id: 'm-1', fecha: '2026-09-30' },
  { id: 't-b', maquina_id: 'm-2', fecha: '2026-09-25' },
  { id: 't-c', maquina_id: 'm-1', fecha: '2026-09-24' },
  { id: 't-v', maquina_id: 'm-1', fecha: '2026-09-20' },
]
const TIRADAS = [
  { id: 'x1', turno_id: 't-a', doble: true, descarte_motivo: 'Se cortó la luz' },
  { id: 'x2', turno_id: 't-b', doble: false, descarte_motivo: '  se cortó  la luz ' },
  { id: 'x3', turno_id: 't-c', doble: false, descarte_motivo: 'se puso el triple de azúcar' },
  { id: 'x4', turno_id: 't-v', doble: false, descarte_motivo: 'vieja' },
]
const ITEMS = [
  { masa_id: 'x1', insumo_id: 'harina', cantidad_kg: 50 },
  { masa_id: 'x1', insumo_id: null, cantidad_kg: 20 },
  { masa_id: 'x2', insumo_id: 'harina', cantidad_kg: 25.5 },
  { masa_id: 'x3', insumo_id: 'azucar', cantidad_kg: 1.25 },
  { masa_id: 'x4', insumo_id: 'harina', cantidad_kg: 999 },
]
function gestion({ fallaTiradas = null, rpc = null } = {}) {
  const S = construirProduccion(ARCHIVO_G)
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.fechaInd = '2026-09-30'
  Object.assign(S.__tablas, {
    turnos_produccion: () => fallaTiradas === 'turnos' ? { data: null, error: { message: 'permission denied for table turnos_produccion' } } : { data: TURNOS, error: null },
    masas: () => ({ data: TIRADAS, error: null }),
    masa_items: () => fallaTiradas === 'items' ? { data: null, error: { message: 'sin conexión' } } : { data: ITEMS, error: null },
    maquinas: [{ id: 'm-1', nombre: 'Máquina 1' }, { id: 'm-2', nombre: marca('maquina') }],
  })
  S.__setRpc(rpc ?? (async () => ({ data: DATOS_RPC, error: null })))
  return S
}
const tarjeta = (html, id) => {
  const i = html.indexOf(`id="pr-ind-${id}"`)
  return i === -1 ? '' : html.slice(i, html.indexOf('</section>', i))
}

esperas.push((async () => {
  const S = gestion()
  // ── Las consultas ──
  const r = await S.leerTiradas('u-cn', '2026-09-30')
  const cons = S.__llamadas.consultas
  const qT = cons.find(c => c[0] === 'turnos_produccion')?.[1] ?? []
  chk('se leen los turnos de la unidad de los últimos 14 días (dos semanas)',
    qT.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-cn') && qT.some(f => f[0] === 'gte' && f[1] === 'fecha' && f[2] === '2026-09-17') &&
    qT.some(f => f[0] === 'lte' && f[1] === 'fecha' && f[2] === '2026-09-30'), JSON.stringify(qT))
  const qM = cons.find(c => c[0] === 'masas')?.[1] ?? []
  chk('… las masas TIRADAS y no anuladas de esos turnos', qM.some(f => f[0] === 'eq' && f[1] === 'descartada' && f[2] === true) &&
    qM.some(f => f[0] === 'eq' && f[1] === 'anulada' && f[2] === false) && qM.some(f => f[0] === 'in' && f[1] === 'turno_id' && f[2].includes('t-a')))
  chk('… y sus renglones, para los kilos', cons.some(c => c[0] === 'masa_items' && c[1].some(f => f[0] === 'in' && f[1] === 'masa_id')))
  // ── El resumen ──
  const d = r.datos
  chk('esta semana (7 días hasta el día elegido): 3 tiradas; la anterior: 1', d?.semana === 3 && d?.anterior === 1, JSON.stringify(d))
  chk('los kilos: solo lo que descontó stock (con insumo) y solo de esta semana (×2 ya viene en cantidad_kg)', d?.kg === 76.75, String(d?.kg))
  chk('por máquina, de más a menos', d?.porMaquina?.[0]?.nombre === 'Máquina 1' && d.porMaquina[0].n === 2 && d.porMaquina[1].n === 1)
  chk('por motivo: se agrupan sin mayúsculas ni espacios de más, con el texto de la primera vez',
    d?.porMotivo?.[0]?.nombre === 'Se cortó la luz' && d.porMotivo[0].n === 2 && d.porMotivo[1].nombre === 'se puso el triple de azúcar', JSON.stringify(d?.porMotivo))

  // ── La tarjeta ──
  await S.cargarIndicadores()
  const html = S.__doc.getElementById('pr-indicadores').innerHTML
  const t = tarjeta(html, 'tiradas')
  const tt = sinEtiquetas(t)
  chk('la tarjeta "Masas tiradas" está, después del scrap', t !== '' && html.indexOf('id="pr-ind-scrap"') < html.indexOf('id="pr-ind-tiradas"'))
  chk('… dice cuántas en la semana y contra la anterior', /3masas tiradas▲ \+2 contra la semana anterior/.test(tt), tt)
  chk('… los kilos de materia prima perdidos', /76,75 kg de materia prima perdidos/.test(tt))
  chk('… por máquina y por motivo', /Por máquina/.test(tt) && /Máquina 12/.test(tt) && /Por motivo/.test(tt) && /Se cortó la luz2/.test(tt))
  chk('… y el contexto dice que lo usado quedó descontado', /lo que se usó quedó descontado/.test(t))
  chequearMarcas(chk, 'tarjeta de tiradas con una máquina maliciosa', t, ['maquina'])
  const t2 = S.renderTiradas({ semana: 1, anterior: 0, kg: 1, porMaquina: [], porMotivo: [{ nombre: marca('motivo'), n: 1 }] })
  chequearMarcas(chk, 'tarjeta de tiradas con un motivo malicioso', t2, ['motivo'])
  chk('en singular con una sola', /masa tirada</.test(t2))
  const cero = sinEtiquetas(S.renderTiradas({ semana: 0, anterior: 2, kg: 0, porMaquina: [], porMotivo: [] }))
  chk('sin tiradas: "Ninguna masa tirada", con la semana anterior y sin ceros', /Ninguna masa tirada/.test(cero) && /La semana anterior: 2 tiradas\./.test(cero) && !/0 kg/.test(cero))
  chk('un dato con otra forma: la tarjeta lo dice (render null)', S.renderTiradas(null) === null && S.renderTiradas({ semana: 'tres' }) === null)

  // ── Falla sola ──
  const SF = gestion({ fallaTiradas: 'turnos' })
  await SF.cargarIndicadores()
  const hf = SF.__doc.getElementById('pr-indicadores').innerHTML
  chk('si no se pueden leer las tiradas, SOLO esa tarjeta lo dice, con el mensaje de la base',
    /No se pudieron leer las masas tiradas\./.test(tarjeta(hf, 'tiradas')) && /permission denied for table turnos_produccion/.test(tarjeta(hf, 'tiradas')) &&
    !/No se pudieron/.test(tarjeta(hf, 'semana')))
  chk('… con su Reintentar', /data-ind-reintentar="1">Reintentar/.test(tarjeta(hf, 'tiradas')))
  const SI = gestion({ fallaTiradas: 'items' })
  const ri = await SI.leerTiradas('u-cn', '2026-09-30')
  chk('si fallan los renglones, también falla (nunca kilos inventados)', ri.datos === null && ri.error === 'sin conexión')
  const SR = gestion({ rpc: async () => ({ data: null, error: { message: 'No tenés permiso.' } }) })
  await SR.cargarIndicadores()
  const hr = SR.__doc.getElementById('pr-indicadores').innerHTML
  chk('si la RPC falla, la tarjeta de tiradas se ve igual', /masas tiradas/.test(sinEtiquetas(tarjeta(hr, 'tiradas'))) && /No se pudieron cargar los indicadores\./.test(tarjeta(hr, 'semana')))
  const SC = gestion()
  SC.estado.tiradas = { cargando: true }
  chk('mientras carga, la tarjeta dice "Cargando…" (aunque la RPC ya haya llegado)', /Cargando…/.test(tarjeta(SC.htmlIndicadores(DATOS_RPC, null), 'tiradas')) &&
    !/Cargando…/.test(tarjeta(SC.htmlIndicadores(DATOS_RPC, null), 'semana')))
  chk('… y cargarIndicadores la pone a cargar antes de pedir', /estado\.tiradas = \{ cargando: true \}\n\s+cont\.innerHTML = htmlIndicadores\(null, null, true\)/.test(FUENTE_G))

  // ── El historial de un turno en la gestión ──
  chk('historial de un turno: lee descartada y su motivo', /anulada, anulada_motivo, descartada, descarte_motivo, es_chocolate'\)\.eq\('turno_id', turnoId\)/.test(FUENTE_G))
  chk('… muestra "Tirada:" con su motivo', /m\.descartada === true \? `<br><strong>Tirada:<\/strong> \$\{esc\(m\.descarte_motivo \?\? ''\)\} · lo que se usó quedó descontado del stock`/.test(FUENTE_G))
  chk('… y la cuenta de masas no suma las tiradas', /const vivas = d\.masas\.filter\(m => !m\.anulada && m\.descartada !== true\)\.length/.test(FUENTE_G))
})())

fin()
