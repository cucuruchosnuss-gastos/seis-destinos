// El diseño "Producción · Gestión" (26/09/2026) en modulos/produccion-gestion.html:
// lo que NO cubren test-produccion-gestion.js (los indicadores) ni las suites
// de configuración e historial.
//
//  - EL MENÚ DE SECCIONES: en la compu una barra lateral de 248 px con tres
//    bloques (Control · Catálogo · Personas) y sus números; en el celular
//    "Menú" lo abre y cada sección tiene "‹ Menú". No hay fila de pestañas.
//    Salir de Configuración con cambios sin guardar pregunta primero.
//  - PERSONAL Y PINES: tabla en la compu, tarjetas en el celular (el MISMO
//    HTML), un solo "Guardar los cambios · N filas" fijo abajo en el celular.
//  - LA HOJA DE PINES: cerrarla pregunta "¿Ya la imprimiste? No se va a
//    volver a mostrar." en un panel propio (decisión de Facu), y recién ahí
//    los PINes se borran.
//  - LOS CONOS: "Activo" y "Doble bolsa" se guardan al tocarlos; si la base
//    rechaza, el control vuelve a lo guardado y el error va PEGADO a la fila.
//  - EL HISTORIAL DE UN TURNO: corregir o anular un sublote, con motivo, con
//    la misma regla de permisos que la base.
//  - HTML malicioso en cada render nuevo.
//
// Se EJECUTA el código real (sandbox-produccion.js).
//
//   node pruebas/test-produccion-gestion-diseno.js

process.env.TZ = 'UTC'

const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || GESTION
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n).map(([, p]) => p)

function armar(tareas = [['ver', { todas: true }], ['configurar', { todas: true }]]) {
  const S = construirProduccion(ARCHIVO)
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta']])
  S.estado.unidadId = 'u-cn'
  S.__setRpc(async () => ({ data: null, error: null }))
  return S
}
const cuerpoCfg = S => S.__doc.getElementById('pr-config-cuerpo').innerHTML
// Un renglón del menú "de verdad" para pintarMenuActivo(), que los busca con
// querySelectorAll (el doble devuelve [] si no se le da).
function itemsDelMenu(S, destinos) {
  const items = destinos.map(d => {
    const el = S.__doc.getElementById(`item-${d}`)
    if (d.startsWith('config:')) el.dataset = { irConfig: d.slice(7) }
    else if (d === 'pendientes') el.dataset = { irPendientes: '' }
    else el.dataset = { menu: d }
    return el
  })
  S.__doc.querySelectorAll = sel => (sel === '.pg-menu__item' ? items : [])
  return items
}

// ── El menú de secciones ────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  const body = S.__body
  S.abrirMenu()
  chk('abrir el menú: la clase en el body y aria-expanded', body.classList.contains('pg-menu-abierto') && S.__doc.getElementById('pr-btn-menu').getAttribute('aria-expanded') === 'true')
  S.cerrarMenu()
  chk('cerrar el menú', !body.classList.contains('pg-menu-abierto') && S.__doc.getElementById('pr-btn-menu').getAttribute('aria-expanded') === 'false')
  S.alternarMenu()
  chk('alternar lo abre', body.classList.contains('pg-menu-abierto'))
  S.alternarMenu()
  chk('… y lo vuelve a cerrar', !body.classList.contains('pg-menu-abierto'))
  chk('el menú se abre con una CLASE y no con [hidden] (la regla global de hidden gana siempre)', !/pr-menu'\)\.hidden = !/.test(FUENTE) && /document\.body\.classList\.add\('pg-menu-abierto'\)/.test(FUENTE))
  chk('Escape lo cierra', /ev\.key === 'Escape' && document\.body\.classList\.contains\('pg-menu-abierto'\)\) cerrarMenu\(\)/.test(FUENTE))
  for (const id of ['pr-historial-volver', 'pr-stock-volver']) {
    chk(`"‹ Menú" de la sección (${id}) abre el menú`, new RegExp(`getElementById\\('${id}'\\)\\.addEventListener\\('click', abrirMenu\\)`).test(FUENTE))
  }
  chk('Historial y Stock dicen "‹ Menú"', ['pr-historial-volver', 'pr-stock-volver'].every(id => new RegExp(`id="${id}"[^>]*>(?:&lsaquo;|‹) Menú<`).test(FUENTE)))
  // Configuración (diseño 7a/7b, 29/09/2026): ‹ atrás, que del detalle vuelve
  // a la lista y, si no hay detalle, abre el menú.
  chk('el ‹ de Configuración va a volverEnConfig', /getElementById\('pr-config-volver'\)\.addEventListener\('click', volverEnConfig\)/.test(FUENTE) && /id="pr-config-volver" aria-label="Atrás"/.test(FUENTE))
  S.estado.config = { tab: 'marcas', movilDetalle: false }
  S.volverEnConfig()
  chk('… sin detalle abierto, abre el menú', body.classList.contains('pg-menu-abierto'))
  S.cerrarMenu()
  S.estado.config = null

  // Qué ve cada cuenta. En el doble todo arranca visible: se esconde antes.
  S.__doc.getElementById('pr-menu').hidden = true
  S.pintarAccesosOficina()
  chk('con ver y configurar: los tres bloques', ['pr-menu-bloque-control', 'pr-menu-bloque-catalogo', 'pr-menu-bloque-personas'].every(id => S.__doc.getElementById(id).hidden === false) &&
    S.__doc.getElementById('pr-menu').hidden === false && body.classList.contains('pg-con-menu'))
  const V = armar([['ver', { todas: true }]])
  V.pintarAccesosOficina()
  chk('solo con ver: Control sí, Catálogo y Personas no', V.__doc.getElementById('pr-menu-bloque-control').hidden === false &&
    V.__doc.getElementById('pr-menu-bloque-catalogo').hidden === true && V.__doc.getElementById('pr-menu-bloque-personas').hidden === true)
  chk('… y los tres renglones de Control se ven', ['pr-btn-ir-pendientes', 'pr-menu-historial', 'pr-menu-stock'].every(id => V.__doc.getElementById(id).hidden === false))
  const C = armar([['configurar', { todas: true }]])
  C.pintarAccesosOficina()
  chk('configurar también ve Control (la regla de puedeVerHistorial)', C.__doc.getElementById('pr-menu-bloque-control').hidden === false)
  const K = armar([['cargar', { todas: true }]])
  K.pintarAccesosOficina()
  chk('sin ver ni configurar: nada de Control', K.__doc.getElementById('pr-menu-bloque-control').hidden === true &&
    ['pr-btn-ir-pendientes', 'pr-menu-historial', 'pr-menu-stock'].every(id => K.__doc.getElementById(id).hidden === true))

  // Los tres bloques, en el HTML, con sus renglones.
  const nav = FUENTE.slice(FUENTE.indexOf('<nav class="pg-menu"'), FUENTE.indexOf('</nav>'))
  chk('el menú tiene los tres bloques, en orden: Control · Catálogo · Personas', /Control<\/p>[^]*Catálogo<\/p>[^]*Personas<\/p>/.test(nav))
  chk('Control: planillas pendientes (con su número), historial y stock terminado',
    /id="pr-btn-ir-pendientes"[^]*id="pr-menu-n-pendientes"[^]*id="pr-menu-historial"[^]*id="pr-menu-stock"/.test(nav))
  chk('Catálogo: Máquinas, Recetas, Ingredientes, Productos (con su empaque) y Marcas / Conos (con su número)',
    /data-ir-config="maquinas"[^]*data-ir-config="recetas"[^]*data-ir-config="ingredientes"[^]*data-ir-config="productos"[^]*data-ir-config="marcas"[^]*id="pr-menu-n-conos"/.test(nav) && !/data-ir-config="empaque"/.test(nav))
  chk('Personas: Personal y PINes', /data-ir-config="personal"[^>]*><span class="pg-menu__txt">Personal y PINes</.test(nav))
  chk('en la compu una barra lateral de 248 px', /grid-template-columns: 248px minmax\(0, 1fr\)/.test(FUENTE))

  // Qué renglón está marcado.
  const M = armar()
  itemsDelMenu(M, ['inicio', 'pendientes', 'historial', 'stock', 'config:maquinas', 'config:marcas', 'config:personal'])
  const marcado = () => ['inicio', 'pendientes', 'historial', 'stock', 'config:maquinas', 'config:marcas', 'config:personal']
    .filter(d => M.__doc.getElementById(`item-${d}`).getAttribute('aria-current') === 'page')
  M.estado.vista = 'pr-inicio'
  M.pintarMenuActivo()
  chk('en inicio: marcado "Indicadores" y nada más', JSON.stringify(marcado()) === '["inicio"]', JSON.stringify(marcado()))
  M.estado.vista = 'pr-config'
  M.estado.config = { tab: 'marcas' }
  M.pintarMenuActivo()
  chk('en Configuración → Marcas: marcado "Marcas / Conos"', JSON.stringify(marcado()) === '["config:marcas"]', JSON.stringify(marcado()))
  M.estado.vista = 'pr-historial'
  M.estado.historial = { estado: 'pendiente_completar', desdePendientes: true }
  M.pintarMenuActivo()
  chk('en el historial abierto desde "Planillas pendientes": marcado ese renglón', JSON.stringify(marcado()) === '["pendientes"]')
  M.estado.historial = { estado: 'pendiente_completar', desdePendientes: false }
  M.pintarMenuActivo()
  chk('… si se filtró a mano, marcado "Historial"', JSON.stringify(marcado()) === '["historial"]')

  // Navegar: cierra el menú y abre la sección.
  const N = armar()
  N.__tablas.maquinas = []
  N.__tablas.turnos_produccion = []
  N.abrirMenu()
  await N.irA('historial')
  chk('tocar un renglón cierra el menú y abre la sección', !N.__body.classList.contains('pg-menu-abierto') && N.estado.vista === 'pr-historial')
  await N.irA('config:recetas')
  chk('un renglón de Configuración abre ESA sección, con su título', N.estado.vista === 'pr-config' && N.estado.config.tab === 'recetas' &&
    N.__doc.getElementById('pr-config-titulo').textContent === 'Recetas')
  N.abrirMenu()
  await N.irA('config:personal')
  chk('… y también cierra el menú (ahí no se pasa por mostrarVista)', !N.__body.classList.contains('pg-menu-abierto'))
  chk('dentro de Configuración, otra sección cambia en el lugar', N.estado.config.tab === 'personal' && N.__doc.getElementById('pr-config-titulo').textContent === 'Personal y PINes')
  // El título cambia al TOCAR, antes de que termine de leer la sección.
  const cambio = N.cambiarSeccionConfig('maquinas')
  chk('… y el título dice la sección nueva mientras se lee', N.__doc.getElementById('pr-config-titulo').textContent === 'Máquinas')
  await cambio
})())

// ── Salir con cambios sin guardar ────────────────────────────────────────
const PERSONAL = [
  { id: 'e1', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], tiene_pin: true, debe_cambiar_pin: false, pin_temporal: false },
  { id: 'e2', nombre: 'Laura Méndez', misma_unidad: true, puestos: ['masero'], tiene_pin: false },
  { id: 'e3', nombre: 'Julio Acosta', misma_unidad: true, puestos: [], tiene_pin: true, debe_cambiar_pin: true },
  { id: 'e4', nombre: 'Otra Unidad', misma_unidad: false, puestos: [], tiene_pin: false },
]
async function personal(S) {
  S.__setRpc(async n => n === 'personal_produccion' ? { data: PERSONAL.map(p => ({ ...p })), error: null } : { data: null, error: null })
  S.__tablas.puestos_temporales = []
  await S.mostrarConfig('personal')
  return S
}

esperas.push((async () => {
  const S = await personal(armar())
  S.__tablas.turnos_produccion = []
  S.__tablas.maquinas = []
  S.tocarPuestoPersonal('e1', 'masero', true)
  await S.irA('historial')
  chk('con cambios sin guardar, ir a otra sección NO se hace de una', S.estado.vista === 'pr-config' && S.estado.config.salida != null)
  chk('… y la pantalla avisa qué se pierde', /1 fila cambiada sin guardar/.test(cuerpoCfg(S)))
  await S.confirmarSalida()
  chk('"Salir sin guardar" va a la sección pedida', S.estado.vista === 'pr-historial')
  const T = await personal(armar())
  T.tocarPuestoPersonal('e1', 'masero', true)
  await T.irA('config:marcas')
  chk('… también a otra sección de Configuración', T.estado.config.tab === 'personal' && T.estado.config.salida != null)
  T.cancelarSalida()
  chk('"Seguir acá" deja los cambios puestos', T.estado.config.cambios.size === 1 && T.estado.config.tab === 'personal')
})())

// ── Personal y PINes ─────────────────────────────────────────────────────
esperas.push((async () => {
  const S = await personal(armar())
  const h = cuerpoCfg(S)
  chk('arriba: la unidad y cuántas personas tiene', /Personal y PINes<\/h2><span class="pc-texto2 pc-14">· 3 personas en Cucuruchos Nuss<\/span>/.test(h), h.slice(0, 300))
  chk('cada rol es una casilla ADENTRO de su label (en el celular, el botón que se prende)',
    /<label class="pc-rol"><span class="pc-tilde"><input type="checkbox" class="pc-tilde__input" data-puesto="encargado" data-persona-puesto="e1" checked aria-label="Encargado: Federico Silva"><span class="pc-tilde__caja" aria-hidden="true"><svg[^]{0,400}?<\/svg><\/span><\/span><span class="pc-rol__txt">Encargado<\/span><\/label>/.test(h))
  chk('el estado del PIN con su texto (el color no va solo)', /pc-chip--grave pr-cfg-chip--alerta">Sin PIN</.test(h) && /pc-chip--gris pr-cfg-chip--gris">Por cambiar</.test(h) && /pc-chip--ok pr-cfg-chip--ok">PIN propio</.test(h))
  chk('"Asignar PIN" a quien no tiene y "Resetear PIN" a quien tiene', /data-pin-asignar="e2">Asignar PIN</.test(h) && /data-pin-asignar="e1">Resetear PIN</.test(h))
  chk('"Generar PIN a los que no tienen" dice a cuántos (solo de ESTA unidad)', /id="pr-cfg-generar-pines">Generar PIN a los que no tienen · 1</.test(h))
  chk('sinPinEnUnidad cuenta solo los de la unidad sin PIN', S.sinPinEnUnidad(PERSONAL) === 1 && S.sinPinEnUnidad(null) === 0)
  chk('UN solo "Guardar los cambios", en el pie', (h.match(/id="pr-cfg-personal-guardar"/g) || []).length === 1 && /class="pc-personal__pie pg-per__pie"[^]*id="pr-cfg-personal-guardar"/.test(h))
  S.tocarPuestoPersonal('e1', 'masero', true)
  S.tocarPuestoPersonal('e3', 'operario', true)
  chk('… que dice cuántas filas se van a mandar', /id="pr-cfg-personal-guardar">Guardar los cambios · 2 filas</.test(cuerpoCfg(S)))
  chk('las filas tocadas se marcan', (cuerpoCfg(S).match(/pr-cfg-fila--tocada/g) || []).length === 2)
  const css = FUENTE.slice(FUENTE.indexOf('LA GESTIÓN · DISEÑO'), FUENTE.indexOf('</style>'))
  const cssCfg = FUENTE.slice(FUENTE.indexOf('CONFIGURACIÓN · diseño "Producción · Configuración"'), FUENTE.indexOf('</style>'))
  chk('en el celular el pie queda FIJO abajo', /@media \(max-width: 899px\) \{[^]*?\.pc-personal__pie \{ position: sticky; bottom: 0;/.test(cssCfg))
  chk('… y cada rol es un botón de 44 px con su nombre a la vista y el tilde (no solo color)', /\.pc-rol \{[^}]*min-height: 44px/.test(cssCfg) && /\.pc-rol__txt \{ position: static;/.test(cssCfg))
  chk('… el tilde marcado es naranja con ✓ (el ícono), el vacío solo borde', /\.pc-tilde__input:checked \+ \.pc-tilde__caja \{ border-color: var\(--naranja\); background: var\(--naranja\); \}/.test(cssCfg) && /\.pc-tilde__input:not\(:checked\) \+ \.pc-tilde__caja svg \{ visibility: hidden; \}/.test(cssCfg))
  chk('el body no corta el scroll de costado con hidden (el pie fijo necesita clip)', /overflow-x: clip/.test(css) && !/body\.pg-gestion \{[^}]*overflow-x: hidden/.test(css))
})())

// ── La hoja de PINes: cerrarla pregunta primero ──────────────────────────
esperas.push((async () => {
  const S = await personal(armar())
  S.estado.miNombre = 'Federico Silva'
  S.__setRpc(async (n) => n === 'generar_pines_iniciales'
    ? { data: [{ empleado_id: 'e2', nombre: 'Laura Méndez', pin: '4821' }], error: null }
    : n === 'personal_produccion' ? { data: PERSONAL.map(p => ({ ...p })), error: null } : { data: null, error: null })
  await S.generarPines()
  const el = id => S.__doc.getElementById(id)
  chk('se abre la hoja con los botones de siempre y sin la pregunta', el('pr-cfg-hoja').hidden === false && el('pr-cfg-hoja-acciones').hidden === false && el('pr-cfg-hoja-confirma').hidden === true &&
    S.estado.config.hojaConfirma === false)
  chk('el título dice cuántos', el('pr-cfg-hoja-titulo').textContent === '1 PIN nuevo')
  chk('dice de qué unidad, cuándo y quién los generó', /^Cucuruchos Nuss · generados el \d{2}\/\d{2} a las \d{2}:\d{2} por Federico Silva$/.test(el('pr-cfg-hoja-de').textContent), el('pr-cfg-hoja-de').textContent)
  chk('cada tira: los roles y que el PIN se cambia la primera vez', /Masero · lo cambiás la primera vez que entrás/.test(el('pr-cfg-hoja-tiras').innerHTML))
  chk('el aviso: se ven una sola vez', el('pr-cfg-hoja-aviso').textContent === 'Solo se ven ahora. Imprimí la hoja antes de cerrar.')
  S.pedirCerrarHoja()
  chk('"Ya la imprimí, cerrar" NO cierra: pregunta en un panel propio', el('pr-cfg-hoja').hidden === false && el('pr-cfg-hoja-confirma').hidden === false && el('pr-cfg-hoja-acciones').hidden === true)
  chk('… y los PINes siguen en pantalla y en memoria', /4821/.test(el('pr-cfg-hoja-tiras').innerHTML) && S.estado.config.hoja?.length === 1 && S.estado.config.hojaConfirma === true)
  S.volverAHojaPines()
  chk('"Volver a la hoja" no toca nada', el('pr-cfg-hoja-confirma').hidden === true && el('pr-cfg-hoja-acciones').hidden === false && /4821/.test(el('pr-cfg-hoja-tiras').innerHTML) && S.estado.config.hoja?.length === 1)
  S.pedirCerrarHoja()
  S.cerrarHojaPines()
  const todo = [...S.__els.values()].map(e => `${e.innerHTML}|${e.textContent}|${e.value}`).join('')
  chk('"Sí, cerrar" recién ahí borra los PINes de la memoria y del DOM', el('pr-cfg-hoja').hidden === true && S.estado.config.hoja === null && !/4821/.test(todo))
  chk('la pregunta está en el HTML, sin confirm()', /¿Ya la imprimiste\? No se va a volver a mostrar\./.test(FUENTE) && !/confirm\(/.test(FUENTE.slice(FUENTE.indexOf('function pedirCerrarHoja'), FUENTE.indexOf('function cerrarHojaPines'))))
  chk('los tres botones van cableados', /'pr-cfg-hoja-cerrar'\)\.addEventListener\('click', pedirCerrarHoja\)/.test(FUENTE) &&
    /'pr-cfg-hoja-cerrar-no'\)\.addEventListener\('click', volverAHojaPines\)/.test(FUENTE) && /'pr-cfg-hoja-cerrar-si'\)\.addEventListener\('click', cerrarHojaPines\)/.test(FUENTE))
  chk('el panel de la pregunta es un alertdialog', /id="pr-cfg-hoja-confirma"[^>]*role="alertdialog"/.test(FUENTE))
  // Sin hoja abierta, pedir cerrar no pregunta nada.
  const T = armar()
  T.estado.config = { hoja: null }
  T.pedirCerrarHoja()
  chk('sin hoja, no hay nada que preguntar', T.__doc.getElementById('pr-cfg-hoja-confirma').hidden === true)
})())

// ── Los conos: Activo y Doble bolsa se guardan al tocarlos ───────────────
const MARCAS = [
  { id: 'mk1', nombre: 'FRIGOR', activa: true, estado_alta: 'aprobada', doble_bolsa: false },
  { id: 'mk2', nombre: 'GRIDO', activa: true, estado_alta: 'aprobada', doble_bolsa: true },
  { id: 'mk3', nombre: 'VIEJA', activa: false, estado_alta: 'aprobada', doble_bolsa: false },
  { id: 'mk4', nombre: 'NUEVA', activa: true, estado_alta: 'pendiente_revision', creada_por: 'e1', creada_en: '2026-09-25T13:00:00Z', doble_bolsa: false },
]
async function conos(S) {
  S.__tablas.marcas_personalizadas = MARCAS.map(m => ({ ...m }))
  S.__tablas.v_empleados_publico = [{ id: 'e1', nombre: 'Laura Méndez' }]
  await S.mostrarConfig('marcas')
  return S
}

esperas.push((async () => {
  const S = await conos(armar())
  let h = cuerpoCfg(S)
  // Diseño 5a (29/09/2026): el título cuenta TODO el catálogo, y el filtro
  // arranca en "Todos" (Activos + Apagados + Por revisar).
  chk('arriba: cuántos conos y cuántos activos', /4 conos del catálogo<\/h2><span class="pc-texto2 pc-15">· 2 activos<\/span>/.test(h))
  chk('el filtro: Todos · Activos · Apagados · Por revisar, con su cuenta', /data-conos-filtro="todos" aria-pressed="true">Todos<span class="pc-seg__n">4</.test(h) &&
    /data-conos-filtro="activos" aria-pressed="false">Activos<span class="pc-seg__n">2</.test(h) && /data-conos-filtro="apagados" aria-pressed="false">Apagados<span class="pc-seg__n">1</.test(h) &&
    /data-conos-filtro="revisar" aria-pressed="false">Por revisar<span class="pc-seg__n">1</.test(h))
  chk('abre en Todos: los cuatro, cada uno con su estado', ['FRIGOR', 'GRIDO', 'VIEJA', 'NUEVA'].every(n => new RegExp(`pc-cono__n">${n}<`).test(h)))
  S.elegirFiltroConos('activos')
  h = cuerpoCfg(S)
  chk('"Activos": FRIGOR y GRIDO, sin VIEJA ni la por revisar', /pc-cono__n">FRIGOR</.test(h) && /pc-cono__n">GRIDO</.test(h) && !/pc-cono__n">VIEJA</.test(h) && !/pc-cono__n">NUEVA</.test(h))
  chk('cada cono: el interruptor "Activo" (role=switch) y el tilde "Doble bolsa"',
    /data-marca-doble="mk2" checked[^>]*aria-label="Doble bolsa: GRIDO"/.test(h) && /role="switch" class="pc-sw__input" data-marca-activo="mk1" checked aria-label="Activo: FRIGOR"/.test(h))
  chk('ya no hay botón Activar/Desactivar', !/data-marca-activa=/.test(h))
  chk('los interruptores van a tocarCono al cambiar', /if \(t\.dataset\?\.marcaActivo !== undefined\) return tocarCono\(t\.dataset\.marcaActivo, 'activa', t\.checked\)/.test(FUENTE))

  // Apagar: se guarda en el acto.
  await S.tocarCono('mk1', 'activa', false)
  chk('apagar llama a guardar_marca con su nombre', JSON.stringify(rpcs(S, 'guardar_marca').at(-1)) === '{"p_id":"mk1","p_nombre":"FRIGOR","p_activa":false}')
  h = cuerpoCfg(S)
  chk('… queda apagado', /data-marca-activo="mk1"(?![^>]*checked)/.test(h) && /pg-cono--apagado/.test(h))
  chk('… y NO desaparece bajo el dedo aunque el filtro sea "Activos"', /pc-cono__n">FRIGOR</.test(h))
  chk('… con un aviso de que se guardó', S.__llamadas.exitos.some(m => m === 'FRIGOR: apagado.'))
  S.elegirFiltroConos('activos')
  chk('al volver a elegir el filtro, recién ahí la lista se rearma', !/pc-cono__n">FRIGOR</.test(cuerpoCfg(S)))

  // La base rechaza: el control vuelve y el error va pegado a ESA fila.
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso.' } }))
  const ok = await S.tocarCono('mk2', 'activa', false)
  h = cuerpoCfg(S)
  chk('si la base rechaza, tocarCono lo dice', ok === false)
  chk('… el interruptor vuelve a lo guardado', /data-marca-activo="mk2" checked/.test(h) && S.estado.config.datos.marcas.find(m => m.id === 'mk2').activa === true)
  chk('… y el error, tal cual, PEGADO a la fila de ese cono', /data-marca-activo="mk2"[^]*?class="pr-cfg-error pg-cono__error" role="alert">No se pudo apagar: No tenés permiso\.<\/div><\/div>/.test(h) &&
    (h.match(/pg-cono__error/g) || []).length === 1)
  S.__setRpc(async () => ({ data: null, error: null }))
  await S.tocarCono('mk2', 'doble_bolsa', false)
  chk('tocar otra cosa borra el error viejo', !/pg-cono__error/.test(cuerpoCfg(S)))
  chk('la doble bolsa va a marcar_doble_bolsa', JSON.stringify(rpcs(S, 'marcar_doble_bolsa').at(-1)) === '{"p_marca_id":"mk2","p_doble":false}')

  // Mientras se guarda, un segundo toque no manda otra cosa.
  // Se guardan TODOS los que esperan: si un segundo toque llegara a llamar,
  // soltar solo al último dejaría colgado al primero (y la suite no terminaría).
  const esperando = []
  S.__setRpc(() => new Promise(r => { esperando.push(r) }))
  const antesGM = rpcs(S, 'guardar_marca').length
  const p1 = S.tocarCono('mk2', 'activa', false)
  chk('mientras se guarda, el interruptor y el tilde quedan trabados', /data-marca-activo="mk2"[^>]*disabled/.test(cuerpoCfg(S)) && /data-marca-doble="mk2"[^>]*disabled/.test(cuerpoCfg(S)))
  const segundo = await Promise.race([S.tocarCono('mk2', 'activa', true), new Promise(r => setTimeout(() => r('colgado'), 50))])
  chk('… y un segundo toque no manda nada', segundo === false && rpcs(S, 'guardar_marca').length === antesGM + 1)
  for (const r of esperando) r({ data: null, error: null })
  await p1
  chk('al volver la respuesta, se destraba', !/data-marca-activo="mk2"[^>]*disabled/.test(cuerpoCfg(S)))

  // Con dos conos a la vista, el error va a UNA sola fila: la del que se tocó.
  const R = await conos(armar())
  R.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso.' } }))
  await R.tocarCono('mk2', 'activa', false)
  const hr = cuerpoCfg(R)
  chk('con dos conos a la vista, el error va SOLO a la fila del que se tocó', (hr.match(/pg-cono__error/g) || []).length === 1 &&
    /data-marca-activo="mk2"[^]*?pg-cono__error/.test(hr) && !/data-marca-activo="mk1"[^<]*<\/label><div class="pr-cfg-error/.test(hr))

  // El buscador filtra y dice cuántos se muestran.
  const B = await conos(armar())
  B.estado.config.busqueda = 'gri'
  B.estado.config.listaConos = null
  B.pintarPestanaConfig()
  chk('con búsqueda: "N conos con …", lo que coincide resaltado, y la × para borrar', /1 cono con “gri”/.test(cuerpoCfg(B)) && /<mark class="pc-hl">GRI<\/mark>DO/.test(cuerpoCfg(B)) &&
    !/pc-cono__n">FRIGOR/.test(cuerpoCfg(B)) && /data-conos-limpiar="1"/.test(cuerpoCfg(B)) && /pc-buscar--lleno/.test(cuerpoCfg(B)))
  await B.accionMarca({ conosLimpiar: '1' })
  chk('la × borra la búsqueda y vuelve a mostrar todo', B.estado.config.busqueda === '' && /pc-cono__n">FRIGOR/.test(cuerpoCfg(B)) && !/data-conos-limpiar/.test(cuerpoCfg(B)))
  // Por revisar: arriba, con quién lo cargó.
  chk('los pendientes, arriba de la lista, con quién los cargó en la tablet', /POR REVISAR · 1<\/div>[^]*lo cargó Laura Méndez en la tablet/.test(cuerpoCfg(B)) &&
    cuerpoCfg(B).indexOf('POR REVISAR · 1</div>') < cuerpoCfg(B).indexOf('id="pr-cfg-marcas-lista"'))
  B.elegirFiltroConos('revisar')
  chk('el filtro "Por revisar" muestra en la tabla solo los por revisar, con su estado', /pc-cono__n">NUEVA<\/div>[^]{0,900}pc-chip--naranja">Por revisar/.test(cuerpoCfg(B).slice(cuerpoCfg(B).indexOf('id="pr-cfg-marcas-lista"'))) &&
    !/pc-cono__n">FRIGOR/.test(cuerpoCfg(B)))
})())

// ── El historial de un turno: corregir o anular un sublote ───────────────
const DETALLE = {
  turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', unidad_negocio_id: 'u-cn', fecha: '2026-09-24', turno: 'Mañana', encargado_id: 'e1', estado: 'cerrado',
    abierto_en: '2026-09-24T09:02:00Z', cerrado_en: '2026-09-24T17:10:00Z', hora_inicio: '06:02:00', hora_apagado: '13:55:00', scrap_kg: 6, observaciones: 'Masa 3 con más agua.' }],
  maquinas: [{ id: 'm1', nombre: 'Máquina 1' }],
  turno_operarios: [], masas: [], masa_items: [], receta_items: [], ingredientes: [], insumos: [], stock_movimientos: [],
  paradas_produccion: [
    { id: 'p1', inicio: '2026-09-24T11:40:00Z', fin: '2026-09-24T11:46:00Z', motivo: 'Se rompió la cadena', hasta_fin_de_turno: false },
    { id: 'p2', inicio: '2026-09-24T12:00:00Z', fin: '2026-09-24T12:30:00Z', motivo: 'Cambio de molde', hasta_fin_de_turno: false },
    // Una que quedó sin fin (datos viejos): no se sabe cuánto duró, no suma.
    { id: 'p3', inicio: '2026-09-24T16:00:00Z', fin: null, motivo: 'Sin fin', hasta_fin_de_turno: false },
  ],
  produccion_items: [
    { id: 'i1', orden: 1, sublote: '7023-1', presentacion_id: 'pr1', marca_id: null, cajas: 35, unidades_por_caja: 320, unidades: 11200, anulado: false },
    { id: 'i2', orden: 2, sublote: '7023-2', presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades_por_caja: 320, unidades: 3200, anulado: true },
  ],
  produccion_correcciones: [],
  producto_presentaciones: [{ id: 'pr1', producto_id: 'pt1', nombre: 'Caja', con_cono: true }],
  productos_terminados: [{ id: 'pt1', nombre: 'Cucuruchón Mini' }],
  marcas_personalizadas: [],
  v_empleados_publico: [{ id: 'e1', nombre: 'Agustín Barrera' }],
}
async function detalle(tareas) {
  const S = armar(tareas)
  Object.assign(S.__tablas, JSON.parse(JSON.stringify(DETALLE)))
  await S.abrirDetalleHistorial('t1')
  return S
}
const cuerpoHist = S => S.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML

esperas.push((async () => {
  const S = await detalle([['ver', { todas: true }], ['configurar', { todas: true }]])
  let h = cuerpoHist(S)
  chk('la cabecera: el lote grande, la máquina y el turno', /<span class="pr-dato__rotulo">Lote<\/span><span class="pr-lote">7023<\/span>/.test(h) && /<strong>Máquina 1<\/strong> · turno Mañana/.test(h))
  chk('… el horario con el día, de abrió a cerró, y cuándo terminó de producir', /Jueves 24\/09 · 06:02 a 14:10 · terminó de producir 13:55/.test(h), h.slice(0, 700))
  chk('… el encargado y el estado', /Encargado<\/span> <strong>Agustín Barrera<\/strong>/.test(h) && /pr-of-chip--cerrado">Cerrado/.test(h))
  chk('en la grilla: Operarios, Masas (con su número) y Paradas y scrap', /<div class="pg-turno__grilla"><section class="pg-caja"><h2 class="pr-subtitulo">Operarios<\/h2>/.test(h) &&
    /<h2 class="pr-subtitulo">Masas <span class="pg-caja__ctx">0<\/span><\/h2>/.test(h) && /<h2 class="pr-subtitulo">Paradas y scrap<\/h2>/.test(h))
  chk('… el total parado sale de las paradas cerradas (6 + 30 = 36 min; la que no tiene fin no suma)', /<dt>Total parada<\/dt><dd>36 min<\/dd>/.test(h), (h.match(/Total parada.{0,60}/) || [''])[0])
  chk('… el scrap', /<dt>Scrap<\/dt><dd>6[^<]*kg<\/dd>/.test(h))
  chk('lo producido dice cuántos renglones y cuántos anulados', /<h2 class="pr-subtitulo">Lo producido <span class="pg-caja__ctx">2 renglones · 1 anulado<\/span><\/h2>/.test(h))
  chk('el sublote vivo tiene Corregir y Anular; el anulado no', /data-sublote-corregir="i1">Corregir/.test(h) && /data-sublote-anular="i1">Anular/.test(h) && !/data-sublote-corregir="i2"/.test(h))

  // Corregir: sin motivo no se manda, y el error va pegado al botón.
  chk('abrir la corrección', S.abrirCorreccionSublote('i1', 'corregir') === true && /id="pr-hist-corr"/.test(cuerpoHist(S)))
  await S.estado.corrigeHist.carga
  await S.guardarCorreccionSublote()
  h = cuerpoHist(S)
  chk('sin motivo: no se manda nada y se dice pegado al botón', rpcs(S, 'corregir_produccion_item_completo').length === 0 &&
    /<div class="pr-cfg-error" role="alert">Escribí el motivo para guardar\.<\/div><button type="button" class="pr-btn" id="pr-hist-corr-guardar">Guardar corrección<\/button>/.test(h))
  chk('… y el botón NO se traba por lo que falta', !/id="pr-hist-corr-guardar"[^>]*disabled/.test(h))
  S.estado.corrigeHist.motivo = 'Se contaron mal'
  await S.guardarCorreccionSublote()
  chk('con las mismas cajas: se dice que no cambió nada', /No cambiaste nada/.test(cuerpoHist(S)) && rpcs(S, 'corregir_produccion_item_completo').length === 0)
  S.estado.corrigeHist.cajas = 0
  await S.guardarCorreccionSublote()
  chk('cero cajas: para sacarlo, anularlo', /Para sacarlo, anulalo/.test(cuerpoHist(S)) && rpcs(S, 'corregir_produccion_item_completo').length === 0)
  S.estado.corrigeHist.cajas = 2.5
  await S.guardarCorreccionSublote()
  chk('cajas con decimales: no se manda', rpcs(S, 'corregir_produccion_item_completo').length === 0)
  S.estado.corrigeHist.cajas = 33
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso para corregir este turno.' } }))
  await S.guardarCorreccionSublote()
  chk('bien armado: corregir_produccion_item_completo con el sublote, SOLO las cajas y el motivo recortado', JSON.stringify(rpcs(S, 'corregir_produccion_item_completo').at(-1)) === '{"p_item_id":"i1","p_datos":{"cajas":33},"p_motivo":"Se contaron mal"}' &&
    rpcs(S, 'corregir_produccion_item').length === 0)
  chk('… el rechazo de la base, tal cual, pegado al botón, y lo escrito se conserva',
    /role="alert">No tenés permiso para corregir este turno\.<\/div><button type="button" class="pr-btn" id="pr-hist-corr-guardar">/.test(cuerpoHist(S)) &&
    S.estado.corrigeHist?.motivo === 'Se contaron mal' && S.estado.corrigeHist?.enviando === false)
  S.__setRpc(async () => ({ data: null, error: null }))
  const lecturas = S.__llamadas.consultas.filter(([t]) => t === 'turnos_produccion').length
  await S.guardarCorreccionSublote()
  chk('guardado: se cierra el editor y se vuelve a leer el turno', S.estado.corrigeHist === null && S.__llamadas.consultas.filter(([t]) => t === 'turnos_produccion').length === lecturas + 1)
  chk('… con un aviso de que se corrigió', S.__llamadas.exitos.some(m => m === 'Sublote 7023-1 corregido.'))

  // Anular: solo motivo.
  S.abrirCorreccionSublote('i1', 'anular')
  h = cuerpoHist(S)
  chk('anular no pide cajas, solo motivo, con el botón en bordó', !/id="pr-hist-corr-cajas"/.test(h) && /class="pr-btn pr-btn--peligro" id="pr-hist-corr-guardar">Anular el sublote/.test(h))
  S.estado.corrigeHist.motivo = '  Se cargó dos veces  '
  await S.guardarCorreccionSublote()
  chk('anular_produccion_item con el sublote y el motivo recortado', JSON.stringify(rpcs(S, 'anular_produccion_item').at(-1)) === '{"p_item_id":"i1","p_motivo":"Se cargó dos veces"}')
  chk('lo que se escribe va al ESTADO en cada tecla (un repintado no lo pierde)', /if \(ev\.target\.id === 'pr-hist-corr-motivo'\) e\.motivo = ev\.target\.value/.test(FUENTE) &&
    /if \(ev\.target\.id === 'pr-hist-corr-cajas'\) e\.cajas = leerCampoNumero\(ev\.target\)/.test(FUENTE))
  chk('las cajas del editor se escriben con ponerNumero, enlazado sin decimales', /enlazarCampoNumero\(campo, \{ decimales: 0 \}\)\s*\n\s*ponerNumero\(campo, estado\.corrigeHist\.cajas \?\? null\)/.test(FUENTE))

  // Permisos: la misma regla que la base.
  const V = await detalle([['ver', { todas: true }]])
  chk('solo con ver: ni Corregir ni Anular', !/data-sublote-corregir|data-sublote-anular/.test(cuerpoHist(V)) && V.abrirCorreccionSublote('i1', 'corregir') === false)
  const Cg = await detalle([['cargar', { unidades: ['u-cn'] }], ['ver', { todas: true }]])
  chk('un turno CERRADO con solo cargar: no se corrige (la base pide configurar)', !/data-sublote-corregir/.test(cuerpoHist(Cg)))
  chk('puedeCorregirSublote: abierto con cargar sí; cerrado con configurar sí; anulado nunca',
    Cg.puedeCorregirSublote({ estado: 'abierto', unidad_negocio_id: 'u-cn' }, { anulado: false }) === true &&
    Cg.puedeCorregirSublote({ estado: 'cerrado', unidad_negocio_id: 'u-cn' }, { anulado: false }) === false &&
    S.puedeCorregirSublote({ estado: 'cerrado', unidad_negocio_id: 'u-cn' }, { anulado: false }) === true &&
    S.puedeCorregirSublote({ estado: 'cerrado', unidad_negocio_id: 'u-cn' }, { anulado: true }) === false)
  chk('una planilla pendiente de completar se corrige con cargar (la base solo trata "cerrado" como cerrado)',
    Cg.puedeCorregirSublote({ estado: 'pendiente_completar', unidad_negocio_id: 'u-cn' }, { anulado: false }) === true)
})())

// ── HTML malicioso en cada render nuevo ──────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.config = { datos: { marcas: [] }, conosOcupados: new Set(), errorCono: { id: marca('conoId'), texto: marca('errorCono') } }
  chequearMarcas(chk, 'fila de un cono', S.htmlFilaCono(S.estado.config, { id: marca('conoId'), nombre: marca('conoNombre'), activa: false, doble_bolsa: true }), ['conoId', 'conoNombre', 'errorCono'])
  chequearMarcas(chk, 'cono por revisar', S.htmlPendienteMarca({ id: marca('pendId'), nombre: marca('pendNombre'), creada_por: 'e', creada_en: '2026-09-25T13:00:00Z' },
    new Map([['e', marca('quien')]]), { error: { donde: 'pend-x', texto: 'y' } }), ['pendId', 'pendNombre', 'quien'])
  const c = { cambios: new Map() }
  chequearMarcas(chk, 'fila de Personal', S.htmlFilaPersonal(c, { id: marca('perId'), nombre: marca('perNombre'), puestos: ['masero'], tiene_pin: false }), ['perId', 'perNombre'])
  chequearMarcas(chk, 'tira de la hoja', S.htmlTiraPin({ nombre: marca('tiraNombre'), pin: marca('tiraPin'), roles: marca('tiraRoles') }), ['tiraNombre', 'tiraPin', 'tiraRoles'])
  S.estado.corrigeHist = { itemId: 'x', modo: 'corregir', cajas: null, motivo: marca('motivo'), error: marca('errorCorr'), enviando: false }
  chequearMarcas(chk, 'editor de un sublote', S.htmlEditorSublote({ id: 'x', sublote: marca('sublote'), cajas: 3 }), ['motivo', 'errorCorr', 'sublote'])
  const D = await detalle([['ver', { todas: true }], ['configurar', { todas: true }]])
  D.estado.detalleHistorial.maquina = { nombre: marca('maquina') }
  D.estado.detalleHistorial.turno.turno = marca('turno')
  D.estado.detalleHistorial.turno.observaciones = marca('observaciones')
  D.estado.detalleHistorial.producido[0].sublote = marca('subloteHist')
  D.estado.detalleHistorial.producido[0].id = marca('itemId')
  chequearMarcas(chk, 'detalle del turno', D.htmlDetalleTurno(D.estado.detalleHistorial), ['maquina', 'turno', 'observaciones', 'subloteHist', 'itemId'])
  S.estado.unidades = new Map([['u-cn', marca('unidadHoja')]])
  S.estado.miNombre = marca('miNombre')
  const de = S.deQuienHoja('u-cn', 'generados')
  chk('la línea de quién generó la hoja va por textContent (no es HTML)', /document\.getElementById\('pr-cfg-hoja-de'\)\.textContent = de/.test(FUENTE) && de.includes(marca('miNombre')))
})())

fin()
