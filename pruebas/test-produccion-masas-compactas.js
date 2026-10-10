// LA LISTA DE MASAS COMPACTA (08/10/2026, pedido de Facu).
//
// En las listas de masas de la planta (la columna "Masas del turno" de la
// receta, la pantalla "Masas del turno" y el historial de una máquina) y en el
// historial de un turno de la gestión, cada masa es UN renglón: el número, la
// hora, Original o Modificada y Simple o Doble (más Chocolate, Anulada o
// Tirada). La fórmula (el recuadro gris de antes, en la gestión) ya no va
// debajo de cada masa: al TOCAR el renglón se abre su detalle —quién la cargó,
// cuándo (fecha y hora de Argentina) y cada ingrediente con su marca, la
// cantidad como salió (×2 en una doble), el lote y la diferencia contra su
// receta—. Una masa con origen 'anterior' se dice "Original" (es la receta
// sin cambios; lo que se aparta lo marca la base como 'modificada').
//
// Se EJECUTAN los renders con el sandbox de Producción (sandbox-produccion.js)
// y un doble de supabase; las marcas <b data-xss> prueban el escape.
//
//   node pruebas/test-produccion-masas-compactas.js

process.env.TZ = 'UTC'

const path = require('path')
const fs = require('fs')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
leer(ARCHIVO)
leer(ARCHIVO_G)
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
const FUENTE_G = fs.readFileSync(ARCHIVO_G, 'utf8')
const { chk, esperas, fin } = arnes()

const copia = (x) => JSON.parse(JSON.stringify(x))
const eqDe = (f, col) => (f.find(x => x[0] === 'eq' && x[1] === col) ?? [])[2]

const MASAS = [
  { id: 'ma1', turno_id: 't1', nro: 1, hora: '2026-09-28T09:30:00Z', doble: false, origen: 'original', es_chocolate: false, anulada: false, masero_id: 'e-mas', motivo: null, receta_id: 'r1' },
  { id: 'ma2', turno_id: 't1', nro: 2, hora: '2026-09-28T10:40:00Z', doble: true, origen: 'modificada', es_chocolate: true, anulada: false, masero_id: 'e-mas', motivo: 'Pidieron de chocolate', receta_id: 'r1' },
  { id: 'ma3', turno_id: 't1', nro: 3, hora: '2026-09-28T11:10:00Z', doble: false, origen: 'anterior', es_chocolate: false, anulada: true, anulada_motivo: 'Se volcó', masero_id: 'e-mas', motivo: null, receta_id: 'r1' },
  { id: 'ma4', turno_id: 't1', nro: 4, hora: '2026-09-28T12:00:00Z', doble: false, origen: 'anterior', es_chocolate: false, anulada: false, descartada: true, descarte_motivo: 'Se quemó', masero_id: 'e-mas', motivo: null, receta_id: 'r1' },
]
const ITEMS = {
  ma2: [
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h', lote: 'W-9', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 2 }, insumos: { nombre: 'Harina 000', marca: 'Wali' } },
    { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '3391', cantidad_simple_kg: 2.7, ingrediente_libre: null, ingredientes: { nombre: 'Azúcar', orden: 3 }, insumos: { nombre: 'Azúcar', marca: 'Ledesma' } },
    { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10, ingrediente_libre: null, ingredientes: { nombre: 'Agua', orden: 1 }, insumos: null },
  ],
  ma1: [{ ingrediente_id: 'i-harina', insumo_id: 'ins-h', lote: 'W-9', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 2 }, insumos: { nombre: 'Harina 000', marca: 'Wali' } }],
}
const RECETA = [
  { receta_id: 'r1', ingrediente_id: 'i-agua', cantidad_kg: 10 },
  { receta_id: 'r1', ingrediente_id: 'i-harina', cantidad_kg: 25 },
  { receta_id: 'r1', ingrediente_id: 'i-azucar', cantidad_kg: 2.5 },
]

function armar({ errorItems = false } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.personal = [{ id: 'e-mas', nombre: 'Agustín Barrera', puestos: ['masero'] }]
  S.estado.tablero = [{ maquina: { nombre: 'Máquina 1' }, turno: { id: 't1', lote: 7033 }, masas: 2, ultimaMasa: null, parada: null }]
  Object.assign(S.__tablas, {
    masa_items: (f) => errorItems ? { data: null, error: { message: 'sin red' } } : { data: copia(ITEMS[eqDe(f, 'masa_id')] ?? []), error: null },
    receta_items: (f) => ({ data: copia(RECETA.filter(r => r.receta_id === eqDe(f, 'receta_id'))), error: null }),
  })
  // La ventana arranca escondida, como en el HTML.
  S.__doc.getElementById('pr-masa-ventana').hidden = true
  // Para afirmar adónde va el foco.
  S.__foco = []
  S.__doc.getElementById('pr-masa-ventana-cerrar').focus = () => S.__foco.push('cerrar')
  S.__doc.querySelector = (sel) => ({ focus: () => S.__foco.push(sel) })
  return S
}

esperas.push((async () => {
  // ── El renglón compacto ───────────────────────────────────────────────
  const S = armar()
  const r1 = S.htmlRenglonMasa(MASAS[0])
  chk('un renglón: Masa 1 · 06:30 · Original · Simple, sin nada más',
    r1 === '<span class="pr-mc__nro"><span class="pr-mc__palabra">Masa </span>1</span><span class="pr-mc__hora">06:30</span><span class="pr-mc__origen">Original</span><span class="pr-mc__tam">Simple</span>', r1)
  const r2 = S.htmlRenglonMasa(MASAS[1])
  chk('la modificada dice "Modificada" en bordó, Doble, y Chocolate',
    /pr-mc__origen pr-mc__origen--modificada">Modificada<\/span><span class="pr-mc__tam">Doble<\/span><span class="pr-mc__marca"><span class="pr-chip-choco">Chocolate/.test(r2), r2)
  chk('una "anterior" se dice "Original" (la receta sin cambios)', /pr-mc__origen">Original</.test(S.htmlRenglonMasa(MASAS[2])) && S.textoOrigenMasa({ origen: 'anterior' }) === 'Original')
  chk('sin origen conocido, "Original"', S.textoOrigenMasa({}) === 'Original' && S.textoOrigenMasa(null) === 'Original' && S.textoOrigenMasa({ origen: 'modificada' }) === 'Modificada')
  chk('la anulada dice "Anulada" en el mismo renglón', /pr-mc__marca"><span class="pr-rm__anulada">Anulada<\/span>/.test(S.htmlRenglonMasa(MASAS[2])))
  chk('la tirada dice "Tirada" en el mismo renglón', /pr-mc__marca"><span class="pr-tirada">Tirada<\/span>/.test(S.htmlRenglonMasa(MASAS[3])))
  chk('una anulada de chocolate dice "Anulada" (no "Chocolate")', !/Chocolate/.test(S.htmlRenglonMasa({ ...MASAS[1], anulada: true })))
  chk('el renglón no lleva la fórmula ni el motivo', !/Harina|Wali|kg|Se volcó|Se quemó|Pidieron/.test(MASAS.map(m => S.htmlRenglonMasa(m)).join('')))
  // En la columna angosta de la receta "Masa" queda para el lector de
  // pantalla, y la palabra escondida no se escapa del scroll de la lista
  // (sin position: relative en el renglón, alargaba la página a 600 × 940).
  chk('la columna de la receta esconde "Masa" sin escaparse de su lista', /\.pr-rm__fila \.pr-mc__palabra \{ position: absolute;[^}]*clip: rect\(0 0 0 0\)/.test(FUENTE) &&
    /\.pr-rm__fila\.pr-mc \{[^}]*position: relative;/.test(FUENTE))
  chk('sin hora, una raya (nunca NaN)', /pr-mc__hora">—</.test(S.htmlRenglonMasa({ nro: 9, hora: 'no' })))

  // Las tres listas de la planta, con el mismo renglón.
  const hm = S.htmlMasaHist(MASAS[1], true)
  chk('historial de la máquina: un botón que elige y apunta al detalle', /^<button type="button" class="pr-hm__masa pr-mc" data-hm-masa="ma2" aria-pressed="true" aria-controls="pr-hm-detalle">/.test(hm) && hm.includes(S.htmlRenglonMasa(MASAS[1])))
  const rc = S.htmlMasaReceta(MASAS[0])
  chk('lista de la receta: un botón que abre la ventana', rc === `<button type="button" class="pr-rm__fila pr-mc" data-masa-ver="ma1" aria-haspopup="dialog">${S.htmlRenglonMasa(MASAS[0])}</button>`, rc)
  chk('… tachado: la anulada y la tirada', /pr-rm__fila pr-mc pr-rm__fila--anulada"/.test(S.htmlMasaReceta(MASAS[2])) && /pr-rm__fila pr-mc pr-rm__fila--tirada"/.test(S.htmlMasaReceta(MASAS[3])))
  const ft = S.htmlFilaMasaTurno(MASAS[0], true)
  chk('"Masas del turno": el renglón es un botón con la máquina, y "Anular" va afuera',
    /<button type="button" class="pr-mc pr-masa-fila__ver" data-masa-ver="ma1" aria-haspopup="dialog">[\s\S]*pr-mc__maq">Máquina 1 · 7033<\/span><\/button><span class="pr-masa-fila__estado">[\s\S]*data-anular-masa="ma1"/.test(ft), ft)
  chk('… una anulada o tirada no lleva "✓ Enviada" ni "Anular"', !/Enviada|data-anular-masa/.test(S.htmlFilaMasaTurno(MASAS[2], true) + S.htmlFilaMasaTurno(MASAS[3], true)))
  chk('… tachada la anulada', /pr-masa-fila pr-masa-fila--anulada"/.test(S.htmlFilaMasaTurno(MASAS[2], true)))
  chk('la columna de la receta abre la ventana al tocar un renglón',
    /const ver = ev\.target\.closest\('\[data-masa-ver\]'\); if \(ver\) \{ abrirVerMasa\(ver\.dataset\.masaVer\); return \}\n\s+if \(ev\.target\.closest\('\[data-anular-ultima\]'\)\)/.test(FUENTE))
  chk('"Masas del turno": "Anular" primero, y si no, el renglón abre la ventana',
    /if \(b\) \{ pedirAnularMasa\(b\.dataset\.anularMasa\); return \}\n\s+const ver = ev\.target\.closest\('\[data-masa-ver\]'\); if \(ver\) abrirVerMasa\(ver\.dataset\.masaVer\)/.test(FUENTE))

  // ── El detalle: quién, cuándo, la fórmula ─────────────────────────────
  chk('cuándo: fecha y hora de Argentina', S.cuandoMasa(MASAS[1]) === '28/09/2026 · 07:40' && S.cuandoMasa({ hora: null }) === '')
  chk('quién: el masero del personal', S.quienMasa(MASAS[1]) === 'Agustín Barrera' && S.quienMasa({ masero_id: 'otro' }) === '')
  const det = await S.leerDetalleMasa(MASAS[1])
  const cu = S.htmlCuerpoMasa(MASAS[1], det)
  chk('el detalle dice cuándo y quién la cargó, y el motivo', /pr-hm__det-sub">28\/09\/2026 · 07:40 · la cargó Agustín Barrera · “Pidieron de chocolate”<\/p>/.test(cu), cu.slice(0, 300))
  chk('… cada ingrediente con su marca, la cantidad como salió (×2) y el lote', /Harina<\/span><span class="pr-hm__ing-cant">50 kg<\/span><span class="pr-hm__ing-marca">Wali · <span class="pr-hm__ing-lote">W-9</.test(cu))
  chk('… y la diferencia contra su receta (como salió)', /Azúcar <span class="pr-rec__dif pr-rec__dif--aleja">\+400 g/.test(cu))
  chk('… lo que no tiene insumo: "no lleva lote"', /Agua<\/span><span class="pr-hm__ing-cant">20 kg<\/span><span class="pr-hm__ing-marca"><span class="pr-hm__ing-lote">no lleva lote/.test(cu))
  chk('la anulada dice por qué', /Se anuló:<\/span> Se volcó/.test(S.htmlCuerpoMasa(MASAS[2], { items: [] })))
  chk('la tirada dice por qué y que el stock no vuelve', /Se tiró:<\/span> Se quemó · lo que se usó quedó descontado del stock/.test(S.htmlCuerpoMasa(MASAS[3], { items: [] })))
  chk('mientras lee: "Cargando…"; si falla, lo dice', /Cargando…/.test(S.htmlCuerpoMasa(MASAS[1], null)) && /No se pudo leer el detalle/.test(S.htmlCuerpoMasa(MASAS[1], { error: true })))
  chk('sin receta conocida no se inventa ninguna diferencia', !/pr-rec__dif|agregado/.test(S.htmlCuerpoMasa(MASAS[1], { ...det, receta: null })))
  chk('el detalle del historial de la máquina usa el MISMO cuerpo',
    /htmlCuerpoMasa\(m, d\)/.test(S.htmlDetalleHist.toString()) && /htmlCuerpoMasa\(m, v\.detalle\)/.test(S.pintarVerMasa.toString()))

  // ── La ventana ────────────────────────────────────────────────────────
  S.estado.masasReceta = copia(MASAS)
  S.estado.vista = 'pr-receta'
  const abrir = S.abrirVerMasa('ma2')
  chk('tocar abre la ventana enseguida, con "Cargando…"', S.__doc.getElementById('pr-masa-ventana').hidden === false &&
    /Cargando…/.test(S.__doc.getElementById('pr-masa-ventana-cuerpo').innerHTML))
  chk('… el foco va a cerrar', S.__foco.includes('cerrar'))
  await abrir
  const vc = S.__doc.getElementById('pr-masa-ventana-cuerpo').innerHTML
  chk('… el título: Masa 2 · Doble, y la máquina', S.__doc.getElementById('pr-masa-ventana-titulo').textContent === 'Masa 2 · Doble' &&
    S.__doc.getElementById('pr-masa-ventana-sub').textContent === 'Máquina 1 · 7033')
  chk('… Modificada, Chocolate, quién, cuándo y la fórmula', /pr-mc__origen--modificada">Modificada/.test(vc) && /pr-chip-choco">Chocolate/.test(vc) &&
    /la cargó Agustín Barrera/.test(vc) && /28\/09\/2026 · 07:40/.test(vc) && /50 kg/.test(vc), vc.slice(0, 500))
  chk('… lee los renglones y la receta de ESA masa', S.__llamadas.consultas.some(([t, f]) => t === 'masa_items' && eqDe(f, 'masa_id') === 'ma2') &&
    S.__llamadas.consultas.some(([t, f]) => t === 'receta_items' && eqDe(f, 'receta_id') === 'r1'))
  S.teclaVerMasa({ key: 'Escape', preventDefault() {} })
  chk('Escape cierra y el foco vuelve al renglón', S.estado.verMasa === null && S.__doc.getElementById('pr-masa-ventana').hidden === true &&
    S.__foco.includes('[data-masa-ver="ma2"]'))
  S.teclaVerMasa({ key: 'Escape', preventDefault() {} })
  chk('Escape sin ventana no rompe nada', S.estado.verMasa === null)
  // Una masa que no está en ninguna lista no abre nada.
  await S.abrirVerMasa('no-existe')
  chk('una masa que no está no abre nada', S.estado.verMasa === null)
  // También desde "Masas del turno".
  S.estado.masasReceta = null
  S.estado.masasTurno = copia(MASAS)
  await S.abrirVerMasa('ma3')
  chk('desde "Masas del turno" también abre, con el motivo de la anulada', S.estado.verMasa?.masaId === 'ma3' && /Se anuló:<\/span> Se volcó/.test(S.__doc.getElementById('pr-masa-ventana-cuerpo').innerHTML))
  S.mostrarVista('pr-sala')
  chk('irse a otra pantalla cierra la ventana', S.estado.verMasa === null && S.__doc.getElementById('pr-masa-ventana').hidden === true)
  // El botón de atrás del sistema (atrasDeLaPlanta) la cierra primero.
  chk('el atrás del sistema cierra la ventana', /if \(estado\.verMasa\) \{ cerrarVerMasa\(\); return 'ventana' \}/.test(FUENTE))
  chk('la X y el fondo cierran; las teclas, teclaVerMasa',
    /if \(ev\.target === ventanaMasa \|\| ev\.target\.closest\('#pr-masa-ventana-cerrar'\)\) cerrarVerMasa\(\)/.test(FUENTE) &&
    /ventanaMasa\.addEventListener\('keydown', teclaVerMasa\)/.test(FUENTE))
  chk('la ventana es un diálogo modal con su título', /<div class="pr-lp" id="pr-masa-ventana" hidden role="dialog" aria-modal="true" aria-labelledby="pr-masa-ventana-titulo">/.test(FUENTE) &&
    /id="pr-masa-ventana-cuerpo" data-scroll-propio/.test(FUENTE))

  // Una respuesta que llega tarde no pisa la ventana de otra masa.
  const L = armar()
  L.estado.masasReceta = copia(MASAS)
  const orig = L.__tablas.masa_items
  let soltar
  L.__tablas.masa_items = (f) => eqDe(f, 'masa_id') === 'ma1' ? new Promise(res => { soltar = () => res(orig(f)) }) : orig(f)
  const lenta = L.abrirVerMasa('ma1')
  await L.abrirVerMasa('ma2')
  soltar(); await lenta
  chk('una respuesta vieja no pisa la ventana', L.estado.verMasa.masaId === 'ma2' && /Azúcar/.test(L.__doc.getElementById('pr-masa-ventana-cuerpo').innerHTML))
  // Error al leer.
  const E = armar({ errorItems: true })
  E.estado.masasReceta = copia(MASAS)
  await E.abrirVerMasa('ma2')
  chk('si no se puede leer, lo dice (no inventa ingredientes)', /No se pudo leer el detalle/.test(E.__doc.getElementById('pr-masa-ventana-cuerpo').innerHTML) && E.estado.verMasa.detalle.error === true)
  // Tab no se sale de la ventana.
  const T = armar()
  const b1 = { id: 'b1', focus() { T.__foco.push('b1') } }, b2 = { id: 'b2', focus() { T.__foco.push('b2') } }
  T.__doc.getElementById('pr-masa-ventana').querySelectorAll = () => [b1, b2]
  T.estado.verMasa = { masaId: 'x' }
  T.__doc.activeElement = b2
  let previno = false
  T.teclaVerMasa({ key: 'Tab', shiftKey: false, preventDefault() { previno = true } })
  chk('Tab en el último vuelve al primero (el foco no se sale)', previno && T.__foco.includes('b1'))

  // ── Escape de textos ──────────────────────────────────────────────────
  const X = armar()
  X.estado.personal = [{ id: 'p', nombre: marca('quien') }]
  X.estado.tablero = [{ maquina: { nombre: marca('maq') }, turno: { id: 'tx', lote: marca('lote') } }]
  const mx = { id: marca('id'), turno_id: 'tx', nro: marca('nro'), hora: null, doble: false, origen: marca('origen'), masero_id: 'p', motivo: marca('motivo'),
    anulada: true, anulada_motivo: marca('anulMot') }
  chequearMarcas(chk, 'renglón compacto', X.htmlRenglonMasa(mx), ['nro'])
  chequearMarcas(chk, 'renglón de la receta', X.htmlMasaReceta(mx), ['nro', 'id'])
  chequearMarcas(chk, 'renglón de "Masas del turno"', X.htmlFilaMasaTurno({ ...mx, anulada: false }, true), ['nro', 'id', 'maq', 'lote'])
  const viva = X.htmlFilaMasaTurno({ ...mx, anulada: false }, true)
  chk('… el id escapado también en "Anular"', viva.includes('data-anular-masa="&quot;&gt;&lt;b data-xss=&quot;id&quot;&gt;"'), viva)
  chk('… y en el botón del renglón', viva.includes('data-masa-ver="&quot;&gt;&lt;b data-xss=&quot;id&quot;&gt;"'))
  chk('el origen nunca imprime el dato', !/data-xss(=|&#?\w*;?)"?origen|&quot;origen/.test(X.htmlRenglonMasa(mx)) && /pr-mc__origen">Original</.test(X.htmlRenglonMasa(mx)))
  chequearMarcas(chk, 'cuerpo del detalle', X.htmlCuerpoMasa(mx, { items: [
    { ingrediente_id: 'i', insumo_id: 'n', lote: marca('loteIng'), cantidad_simple_kg: 1, ingredientes: { nombre: marca('ing') }, insumos: { marca: marca('marcaIns') } },
    { ingrediente_id: null, cantidad_simple_kg: 1, ingrediente_libre: marca('libre') }], receta: null }), ['quien', 'motivo', 'anulMot', 'loteIng', 'ing', 'marcaIns', 'libre'])
  chequearMarcas(chk, 'cuerpo de una tirada', X.htmlCuerpoMasa({ ...mx, anulada: false, descartada: true, descarte_motivo: marca('tiro') }, null), ['tiro'])
  X.estado.masasReceta = [mx]
  await X.abrirVerMasa(mx.id)
  chk('el título y la máquina de la ventana van por textContent', X.__doc.getElementById('pr-masa-ventana-titulo').textContent.includes(marca('nro')) &&
    /textContent = `Masa \$\{m\.nro \?\? '—'\}/.test(FUENTE) && /getElementById\('pr-masa-ventana-sub'\)\.textContent = /.test(FUENTE))

  // ── La gestión: el historial de un turno ──────────────────────────────
  const G = construirProduccion(ARCHIVO_G)
  const d = {
    masas: copia(MASAS).map(m => ({ ...m, tipo_masa: 'Común' })),
    items: [
      { masa_id: 'ma2', ingrediente_id: 'i-harina', insumo_id: 'ins-h', lote: 'W-9', lote_fuera_de_stock: false, cantidad_simple_kg: 25, cantidad_kg: 50 },
      { masa_id: 'ma2', ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '3391', lote_fuera_de_stock: true, cantidad_simple_kg: 2.7, cantidad_kg: 5.4 },
      { masa_id: 'ma2', ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10, cantidad_kg: 20 },
      { masa_id: 'ma2', ingrediente_id: 'i-bica', insumo_id: null, lote: null, cantidad_simple_kg: 0, cantidad_kg: 0 },
    ],
    recItems: RECETA, ingredientes: [{ id: 'i-agua', nombre: 'Agua', orden: 1 }, { id: 'i-harina', nombre: 'Harina', orden: 2 }, { id: 'i-azucar', nombre: 'Azúcar', orden: 3 }, { id: 'i-bica', nombre: 'Bicarbonato', orden: 4 }],
    insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali' }, { id: 'ins-az', nombre: 'Azúcar', marca: null }],
    nombres: new Map([['e-mas', 'Agustín Barrera']]),
  }
  G.estado.masaHistAbierta = null
  const g2 = G.htmlMasaHistorial(d.masas[1], d)
  chk('gestión: un renglón, un botón cerrado', /^<li class="pr-lista__item pg-masa"><button type="button" class="pg-masa__renglon" data-masa-hist="ma2" aria-expanded="false">/.test(g2) && /<\/button><\/li>$/.test(g2), g2)
  chk('… Masa 2 · 07:40 · Modificada · Doble · Chocolate', /pg-masa__nro">Masa 2<\/span><span class="pg-masa__hora">07:40<\/span><span class="pg-masa__origen pg-masa__origen--modificada">Modificada<\/span><span class="pg-masa__tam">Doble<\/span><span class="pr-chip-choco">Chocolate/.test(g2))
  chk('… sin la fórmula ni el masero (el recuadro gris se fue)', !/Harina|Wali|kg|Agustín|pr-texto-suave|pg-masa__det/.test(g2))
  chk('… una "anterior" dice Original', /pg-masa__origen">Original</.test(G.htmlMasaHistorial(d.masas[2], d)))
  chk('… la anulada y la tirada, tachadas y dichas', /pg-masa pg-masa--anulada"[\s\S]*pg-masa__marca">Anulada</.test(G.htmlMasaHistorial(d.masas[2], d)) &&
    /pg-masa pg-masa--tirada"[\s\S]*pg-masa__marca">Tirada</.test(G.htmlMasaHistorial(d.masas[3], d)))
  G.estado.masaHistAbierta = 'ma2'
  const a2 = G.htmlMasaHistorial(d.masas[1], d)
  chk('gestión abierta: aria-expanded y aria-controls al detalle', /data-masa-hist="ma2" aria-expanded="true" aria-controls="pg-masa-det-ma2">/.test(a2) && /<div class="pg-masa__det" id="pg-masa-det-ma2">/.test(a2))
  chk('… quién la cargó, cuándo y el tipo', /La cargó <strong>Agustín Barrera<\/strong> · 28\/09\/2026 · 07:40 · Común/.test(a2), a2)
  chk('… la diferencia contra su receta', /\+200 g Azúcar/.test(a2))
  chk('… cada ingrediente: nombre, cantidad como salió, marca y lote', /pg-mf__nombre">Harina<\/span><span class="pg-mf__cant">50 kg<\/span><span class="pg-mf__marca">Wali · lote W-9</.test(a2))
  chk('… el lote fuera de stock se marca; sin marca, el nombre del insumo', /pg-mf__marca">Azúcar · lote 3391 · fuera de stock</.test(a2))
  chk('… sin insumo, "no lleva lote"', /Agua<\/span><span class="pg-mf__cant">20 kg<\/span><span class="pg-mf__marca">no lleva lote</.test(a2))
  chk('… lo que va en 0 no aparece', !/Bicarbonato/.test(a2))
  chk('… en el orden de los ingredientes', a2.indexOf('>Agua<') < a2.indexOf('>Harina<') && a2.indexOf('>Harina<') < a2.indexOf('>Azúcar<'))
  chk('… sin ingredientes, lo dice', /Sin ingredientes\./.test(G.htmlFormulaMasa({ id: 'zz' }, d)))
  G.estado.masaHistAbierta = 'ma3'
  chk('… la anulada abierta dice su motivo', /Anulada:<\/strong> Se volcó/.test(G.htmlMasaHistorial(d.masas[2], d)))
  G.estado.masaHistAbierta = 'ma4'
  chk('… la tirada abierta dice su motivo', /Tirada:<\/strong> Se quemó · lo que se usó quedó descontado del stock/.test(G.htmlMasaHistorial(d.masas[3], d)))
  chk('… y la otra queda cerrada', /aria-expanded="false"/.test(G.htmlMasaHistorial(d.masas[1], d)) && !/pg-masa__det/.test(G.htmlMasaHistorial(d.masas[1], d)))
  G.estado.masaHistAbierta = null
  G.estado.detalleHistorial = { ...d, turno: { id: 't1', estado: 'cerrado' }, operarios: [], paradas: [], producido: [], correcciones: [], presentaciones: [], productos: [], marcas: [], empaque: { estado: 'desconocido' }, insumosEmpaque: [] }
  chk('alternar: abre', G.alternarMasaHistorial('ma2') === true && G.estado.masaHistAbierta === 'ma2')
  chk('alternar: la misma la cierra', G.alternarMasaHistorial('ma2') === true && G.estado.masaHistAbierta === null)
  chk('alternar: otra masa abre esa', G.alternarMasaHistorial('ma1') === true && G.alternarMasaHistorial('ma2') === true && G.estado.masaHistAbierta === 'ma2')
  chk('alternar: una que no está no hace nada', G.alternarMasaHistorial('nada') === false && G.estado.masaHistAbierta === 'ma2')
  chk('el listener del detalle del turno alterna la masa', /const mh = ev\.target\.closest\('\[data-masa-hist\]'\); if \(mh\) return alternarMasaHistorial\(mh\.dataset\.masaHist\)/.test(FUENTE_G))
  const gx = { ...d.masas[1], id: marca('gid'), nro: marca('gnro'), tipo_masa: marca('gtipo'), origen: marca('gorigen'), masero_id: 'x' }
  const dx = { ...d, items: [{ masa_id: gx.id, ingrediente_id: null, ingrediente_libre: marca('glibre'), insumo_id: 'gi', lote: marca('glote'), cantidad_kg: 1 }],
    insumos: [{ id: 'gi', nombre: 'x', marca: marca('gmarca') }], nombres: new Map([['x', marca('gquien')]]) }
  G.estado.masaHistAbierta = gx.id
  chequearMarcas(chk, 'masa del historial de la gestión, abierta', G.htmlMasaHistorial(gx, dx), ['gid', 'gnro', 'gtipo', 'glibre', 'glote', 'gmarca', 'gquien'])
  chk('… el origen nunca imprime el dato', !/gorigen/.test(G.htmlMasaHistorial(gx, dx)))
  G.estado.masaHistAbierta = gx.id
  chequearMarcas(chk, 'masa anulada de la gestión, abierta', G.htmlMasaHistorial({ ...gx, anulada: true, anulada_motivo: marca('gmot') }, dx), ['gmot'])
  chequearMarcas(chk, 'masa tirada de la gestión, abierta', G.htmlMasaHistorial({ ...gx, descartada: true, descarte_motivo: marca('gtiro') }, dx), ['gtiro'])
})())

fin()
