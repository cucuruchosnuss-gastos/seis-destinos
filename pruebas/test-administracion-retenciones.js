// ADMINISTRACIÓN — Retenciones (13/10/2026).
//
// Lo que se EJECUTA (sandbox-administracion.js, con un Supabase falso):
//  - la sección se ve SOLO con gastos:gastos_empresa (o super_admin), con su
//    pestaña después de Cheques y su tarjeta en la portada;
//  - lee retenciones_resumen con p_desde (el 1º del mes), p_hasta (hoy) y la
//    empresa de la barra (null con "Todas"); con "Todas" cada renglón y cada
//    grupo de totales dicen su empresa; la fábrica de pruebas no se ve;
//  - las tarjetas de total por tipo (y el Total de cada empresa) con 2
//    decimales; un dato ausente es "—", nunca "$ 0";
//  - Anular: el panel con motivo obligatorio (nunca confirm()), un doble toque
//    manda una vez, el error de la base va TAL CUAL pegado al botón;
//  - Cargar: la empresa de la barra viene puesta, la fecha es hoy, las
//    validaciones, el aviso antes de confirmar ("Baja la deuda de X en $ …" /
//    "Se descuenta $ … de <cuenta>"), los parámetros EXACTOS de
//    registrar_retencion y registrar_retencion_banco (la del banco sin número
//    de certificado), la jurisdicción solo en IIBB / SIRCREB / percepción de
//    IIBB, el certificado como texto tal cual;
//  - el buscador de clientes: buscar_clientes con la empresa, muestra el apodo
//    que coincidió; sin permiso de buscar, la lista local;
//  - la cuenta del cliente dice "Retención <tipo legible> · cert. N";
//  - el Excel: el importe como número, el certificado como texto;
//  - todo texto de la base escapado.
//
//   node pruebas/test-administracion-retenciones.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)) }
const MAL = '"><img src=x onerror=alert(1)>'

const POR_TIPO = [
  { unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', tipo: 'ganancias', total: 12500.5, cantidad: 1 },
  { unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', tipo: 'percepcion_iibb', total: 3200, cantidad: 2 },
  { unidad_negocio_id: 'u-d', unidad: 'Dolce Pasta', tipo: 'iva', total: null, cantidad: 1 },
  // Una empresa y un tipo que la pantalla no conoce: se muestran tal cual, escapados.
  { unidad_negocio_id: 'u-t', unidad: 'Taller ' + MAL, tipo: 'nuevo ' + MAL, total: 10, cantidad: 1 },
  { unidad_negocio_id: 'u-p', unidad: 'Pruebas (robot)', tipo: 'iva', total: 5, cantidad: 1 },
]
const LISTA = [
  { id: 'r1', unidad: 'Cucuruchos Nuss', fecha: '2026-10-10', tipo: 'percepcion_iibb', importe: 1200, origen: 'cliente', cliente: 'Anatolia ' + MAL,
    numero_certificado: '0001-00012345', jurisdiccion: 'Córdoba ' + MAL, detalle: 'nota ' + MAL, cargado_por: 'Emanuel ' + MAL, anulado: false, anulado_motivo: null },
  { id: 'r2', unidad: 'Dolce Pasta', fecha: '2026-10-08', tipo: 'sircreb', importe: null, origen: 'banco', cliente: null,
    numero_certificado: null, jurisdiccion: null, detalle: 'Banco Macro', cargado_por: null, anulado: false, anulado_motivo: null },
  { id: 'r5' + MAL, unidad: 'Taller', fecha: '2026-10-04', tipo: 'nuevo ' + MAL, importe: 10, origen: 'raro ' + MAL, cliente: null,
    numero_certificado: null, jurisdiccion: null, detalle: null, cargado_por: null, anulado: false, anulado_motivo: null },
  { id: 'r3', unidad: 'Cucuruchos Nuss', fecha: '2026-10-02', tipo: 'iva', importe: 999, origen: 'otro', cliente: null,
    numero_certificado: null, jurisdiccion: null, detalle: null, cargado_por: 'Emanuel', anulado: true, anulado_motivo: 'Duplicada ' + MAL },
  { id: 'r4', unidad: 'Pruebas (robot)', fecha: '2026-10-01', tipo: 'iva', importe: 5, origen: 'otro', cliente: null,
    numero_certificado: null, jurisdiccion: null, detalle: null, cargado_por: 'Robot', anulado: false, anulado_motivo: null },
]

function nuevo({ rol = 'usuario', conTarea = true, barra = null, resumen = { por_tipo: POR_TIPO, lista: LISTA }, rpc } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ...(conTarea ? [['gastos:gastos_empresa', null]] : [])])
  S.estado.empresas.push({ id: 'u-p', nombre: 'Pruebas (robot)' })
  S.estado.fabrica = { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: false }
  S.estado.unidadBarra = barra
  S.__setRpc(async (n, p) => {
    if (rpc) { const r = await rpc(n, p); if (r !== undefined) return r }
    if (n === 'retenciones_resumen') return { data: typeof resumen === 'function' ? resumen(p) : resumen, error: null }
    return { data: null, error: null }
  })
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const texto = (S, id) => S.__els.get(id)?.textContent ?? ''
const rpcs = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)

async function pruebas() {
  // ── Quién la ve ──────────────────────────────────────────────────────
  {
    const S = nuevo()
    chk('con gastos:gastos_empresa se ve la sección', S.seccionesVisibles().some(s => s.id === 'retenciones'))
    S.estado.vista = 'ad-vista-inicio'
    S.pintarPestanas()
    chk('su pestaña está', /data-pestana="retenciones"[^>]*>Retenciones</.test(html(S, 'ad-pestanas')))
    const sin = nuevo({ conTarea: false })
    chk('sin gastos:gastos_empresa NO se ve', !sin.seccionesVisibles().some(s => s.id === 'retenciones'))
    sin.estado.vista = 'ad-vista-inicio'
    sin.pintarPestanas()
    chk('sin la tarea no hay pestaña', !/data-pestana="retenciones"/.test(html(sin, 'ad-pestanas')))
    await sin.mostrarRetenciones()
    chk('sin la tarea, entrar derecho vuelve a la portada y no consulta', sin.estado.vista === 'ad-vista-inicio' && !rpcs(sin, 'retenciones_resumen').length)
    const sa = nuevo({ rol: 'super_admin', conTarea: false })
    chk('un super_admin la ve (bypass, como tiene_tarea)', sa.seccionesVisibles().some(s => s.id === 'retenciones'))
    const orden = S.PESTANAS.map(p => p[0]).join(',')
    chk('va después de Cheques', /cheques,retenciones,(prestamos,)?seguridad/.test(orden), orden)
    chk('no es de una empresa (se esconde el selector)', S.VISTAS_GLOBALES.includes('ad-vista-retenciones'))
    chk('Administración lee las tareas de gastos', /\.in\('modulo', \[[^\]]*'gastos'\]\)/.test(src))
  }

  // ── Leer y pintar (Todas) ───────────────────────────────────────────
  {
    const S = nuevo()
    await S.mostrarRetenciones()
    await esperar()
    const hoy = S.hoyArgentina()
    const ll = rpcs(S, 'retenciones_resumen')
    chk('lee retenciones_resumen una vez', ll.length === 1, ll.length)
    chk('con los parámetros exactos: del 1º del mes a hoy y sin empresa (Todas)',
      JSON.stringify(ll[0]?.[1]) === JSON.stringify({ p_desde: hoy.slice(0, 8) + '01', p_hasta: hoy, p_unidad_negocio_id: null }), JSON.stringify(ll[0]?.[1]))
    chk('abre la vista', S.estado.vista === 'ad-vista-retenciones')
    const t = html(S, 'ad-ret-totales')
    const l = html(S, 'ad-ret-lista')
    chk('ningún texto de la base entra crudo', !t.includes('<img src=x') && !l.includes('<img src=x'))
    chk('los totales por tipo, con 2 decimales', /Ganancias<\/div><div class="ad-ret-total__plata">\$\s12\.500,50</.test(t) && /Percepción de IIBB<\/div><div class="ad-ret-total__plata">\$\s3\.200,00</.test(t), t)
    chk('el Total de la empresa suma en centavos', /Total<\/div><div class="ad-ret-total__plata">\$\s15\.700,50</.test(t))
    chk('un total ausente es "—", nunca "$ 0"', /IVA<\/div><div class="ad-ret-total__plata">—</.test(t) && !/\$\s0,00/.test(t))
    chk('la cantidad: singular y plural', /1 retención</.test(t) && /2 retenciones</.test(t))
    chk('con "Todas", cada grupo dice su empresa', /ad-ret-empresa__nombre">Cucuruchos Nuss</.test(t) && /ad-ret-empresa__nombre">Dolce Pasta</.test(t))
    chk('la fábrica de pruebas no se ve (ni en totales ni en la lista)', !/Pruebas \(robot\)/.test(t) && !/data-retencion="r4"/.test(l))
    const r1 = (l.match(/<div class="ad-fila ad-ret-fila"[^>]*data-retencion="r1"[\s\S]*?data-ret-anular="r1"/) || [''])[0]
    chk('un renglón: tipo legible, importe y origen con el cliente (escapado)', /Percepción de IIBB/.test(r1) && /\$\s1\.200,00/.test(r1) && /Cliente: Anatolia &quot;&gt;&lt;img/.test(r1))
    chk('con "Todas", el renglón dice su empresa', /10\/10\/2026 · Cliente: Anatolia[^<]*· Cucuruchos Nuss/.test(r1))
    chk('el certificado, la jurisdicción, el detalle y quién la cargó (escapados)', /Cert\. 0001-00012345 · Córdoba &quot;&gt;/.test(r1) && /Cargó Emanuel &quot;&gt;/.test(r1))
    chk('un importe ausente en la lista es "—"', /data-retencion="r2"[\s\S]*?ad-fila__importe">—</.test(l))
    chk('la del banco dice "Debitada por el banco"', /data-retencion="r2"[\s\S]*?Debitada por el banco/.test(l))
    const r3 = (l.match(/data-retencion="r3"[\s\S]*?<\/div><\/div>/) || [''])[0]
    chk('una anulada: el sello, el importe tachado, el motivo y SIN "Anular"', /ad-fila--anulada" data-retencion="r3"/.test(l) && /ad-sello--anulada">Anulada/.test(l) &&
      /ad-fila__importe--anulada">\$\s999,00/.test(l) && /Anulada: Duplicada &quot;&gt;/.test(l) && !/data-ret-anular="r3"/.test(l))
    chk('un tipo, un origen y un id que no se conocen: tal cual y escapados', /nuevo &quot;&gt;&lt;img/.test(l) && /data-ret-anular="r5&quot;&gt;/.test(l) && /data-retencion="r5&quot;&gt;/.test(l) && /raro &quot;&gt;/.test(l))
    chk('una empresa que no se conoce en los totales, escapada', /ad-ret-empresa__nombre">Taller &quot;&gt;/.test(t) && /nuevo &quot;&gt;&lt;img/.test(t))
    chk('la cuenta dice cuántas y cuántas anuladas', texto(S, 'ad-ret-cantidad') === '4 retenciones (1 anulada, no suma)', texto(S, 'ad-ret-cantidad'))
    chk('dice que son todas las empresas', /Todas las empresas/.test(texto(S, 'ad-ret-empresa-texto')))
    void r3
  }

  // ── Con una empresa elegida arriba ─────────────────────────────────────
  {
    const S = nuevo({ barra: 'u-n' })
    await S.mostrarRetenciones()
    await esperar()
    chk('pide SOLO la empresa de la barra', rpcs(S, 'retenciones_resumen')[0]?.[1]?.p_unidad_negocio_id === 'u-n')
    chk('sin "Todas", no repite la empresa en cada grupo', !/ad-ret-empresa__nombre/.test(html(S, 'ad-ret-totales')))
    chk('dice qué empresa', /Empresa: Cucuruchos Nuss/.test(texto(S, 'ad-ret-empresa-texto')))
    S.alCambiarLaBarra('u-d')
    await esperar()
    chk('cambiar la barra vuelve a leer con la empresa nueva', rpcs(S, 'retenciones_resumen').at(-1)?.[1]?.p_unidad_negocio_id === 'u-d')
    // El período: el control de periodo.js pone las fechas y dispara 'change'.
    S.__els.get('ad-ret-desde').value = '2026-09-01'
    S.__els.get('ad-ret-hasta').value = '2026-09-30'
    S.cambiarPeriodoRet()
    await esperar()
    const p = rpcs(S, 'retenciones_resumen').at(-1)?.[1]
    chk('cambiar el período vuelve a leer con esas fechas', p?.p_desde === '2026-09-01' && p?.p_hasta === '2026-09-30', JSON.stringify(p))
    chk('el período: el control de js/periodo.js, con las dos fechas obligatorias',
      /crearPeriodo\(\{ desde: document\.getElementById\('ad-ret-desde'\), hasta: document\.getElementById\('ad-ret-hasta'\), obligatorias: true \}\)/.test(src))
  }

  // ── Vacío, sin permiso, error ──────────────────────────────────────────
  {
    const S = nuevo({ resumen: { por_tipo: [], lista: [] } })
    await S.mostrarRetenciones()
    await esperar()
    chk('sin retenciones: lo dice con palabras, sin tarjetas', /No hay retenciones cargadas en este período/.test(html(S, 'ad-ret-lista')) && html(S, 'ad-ret-totales') === '')
    const N = nuevo({ resumen: null })
    await N.mostrarRetenciones()
    await esperar()
    chk('null de la base: dice que falta el permiso', /no se pueden ver las retenciones/.test(html(N, 'ad-ret-lista')))
    const E = nuevo({ rpc: (n) => n === 'retenciones_resumen' ? { data: null, error: { message: 'boom' } } : undefined })
    await E.mostrarRetenciones()
    await esperar()
    chk('un error: lo dice, sin inventar un cero', /No se pudieron leer las retenciones/.test(html(E, 'ad-ret-lista')) && !/\$\s0/.test(html(E, 'ad-ret-totales')))
  }

  // ── La portada ─────────────────────────────────────────────────────────
  {
    const S = nuevo({ barra: 'u-n' })
    const r = await S.leerRetencionesPortada()
    chk('portada: suma lo del mes, sin la fábrica de pruebas', r.cantidad === 5 && r.total === 15710.5, JSON.stringify(r))
    chk('portada: lo pide en la empresa de la barra', rpcs(S, 'retenciones_resumen')[0]?.[1]?.p_unidad_negocio_id === 'u-n')
    const sec = S.SECCIONES.find(s => s.id === 'retenciones')
    const c = S.contenidoSeccion(sec, { retenciones: r })
    chk('la tarjeta: la cantidad y la plata del mes', c.numero === 5 && JSON.stringify(c.lineas).includes('$\u00a015.710,50 que nos retuvieron'), JSON.stringify(c))
    const e = S.contenidoSeccion(sec, { errorRetenciones: 'No se pudo contar.' })
    chk('si no se pudo contar, no inventa un número', e.numero === null && !!e.error)
    const z = S.contenidoSeccion(sec, { retenciones: { total: null, cantidad: 0 } })
    chk('sin ninguna en el mes lo dice con palabras (nunca "$ 0")', z.numero === 0 && /no se cargó ninguna/.test(JSON.stringify(z.lineas)) && !/\$\s0/.test(JSON.stringify(z)))
    const N = nuevo({ resumen: null })
    let tiro = false
    try { await N.leerRetencionesPortada() } catch { tiro = true }
    chk('portada: sin permiso (null) cuenta como que no se pudo', tiro)
  }

  // ── Anular ────────────────────────────────────────────────────────────
  {
    let resolver
    const S = nuevo({ rpc: (n) => n === 'anular_retencion' ? new Promise(r => { resolver = r }) : undefined })
    await S.mostrarRetenciones()
    await esperar()
    S.abrirAnularRet('r1')
    const l = html(S, 'ad-ret-lista')
    chk('anular abre un panel propio en el renglón, con el motivo', /id="ad-ret-motivo"/.test(l) && /id="ad-ret-anular-si"/.test(l) && !/confirm\(/.test(src.slice(src.indexOf('function confirmarAnularRet'), src.indexOf('function confirmarAnularRet') + 1500)))
    S.estado.retenciones.anulando.motivo = 'ab'
    await S.confirmarAnularRet()
    chk('motivo de menos de 3 letras: no llama a la base y lo dice', !rpcs(S, 'anular_retencion').length && /al menos 3 letras/.test(html(S, 'ad-ret-lista')))
    S.estado.retenciones.anulando.motivo = '  Cargada dos veces ' + MAL + '  '
    const p1 = S.confirmarAnularRet()
    const p2 = S.confirmarAnularRet()
    chk('un doble toque manda UNA vez', rpcs(S, 'anular_retencion').length === 1)
    chk('con los parámetros exactos (el motivo limpio)', JSON.stringify(rpcs(S, 'anular_retencion')[0]?.[1]) === JSON.stringify({ p_id: 'r1', p_motivo: 'Cargada dos veces ' + MAL }))
    chk('mientras manda, el botón se traba', /id="ad-ret-anular-si" disabled/.test(html(S, 'ad-ret-lista')))
    resolver({ data: null, error: { message: 'Ya está anulada. ' + MAL } })
    await p1; await p2; await esperar()
    const l2 = html(S, 'ad-ret-lista')
    chk('el error de la base va TAL CUAL, pegado (y escapado)', /ad-error-pegado">Ya está anulada\. &quot;&gt;&lt;img/.test(l2) && !l2.includes('<img src=x'))
    chk('después del error se puede volver a intentar', !/id="ad-ret-anular-si" disabled/.test(l2))
    chk('el motivo escrito sigue en el campo, escapado', /id="ad-ret-motivo"[^>]*>  Cargada dos veces &quot;&gt;&lt;img/.test(l2))
  }
  {
    const S = nuevo({ rpc: (n) => n === 'anular_retencion' ? { data: null, error: null } : undefined })
    await S.mostrarRetenciones()
    await esperar()
    S.abrirAnularRet('r1')
    S.estado.retenciones.anulando.motivo = 'Era de otra empresa'
    await S.confirmarAnularRet()
    await esperar()
    chk('anulada: avisa y vuelve a leer', S.__llamadas.exitos.some(m => /anulada/.test(m)) && rpcs(S, 'retenciones_resumen').length === 2 && S.estado.retenciones.anulando === null)
    S.abrirAnularRet('r1')
    S.cancelarAnularRet()
    chk('"No, dejarla" cierra el panel', !/id="ad-ret-motivo"/.test(html(S, 'ad-ret-lista')))
  }

  // ── Cargar: el formulario ──────────────────────────────────────────────
  {
    const S = nuevo({ barra: 'u-n' })
    S.abrirCargaRet()
    const c = S.estado.retenciones.carga
    chk('la empresa de la barra viene puesta', c.empresaId === 'u-n')
    chk('la fecha es hoy (Argentina)', c.fecha === S.hoyArgentina())
    chk('el panel se muestra', S.__els.get('ad-ret-carga').hidden === false)
    const emp = html(S, 'ad-ret-empresa')
    chk('las empresas, sin la fábrica de pruebas', /Cucuruchos Nuss/.test(emp) && /Dolce Pasta/.test(emp) && !/Pruebas/.test(emp))
    const tipos = html(S, 'ad-ret-tipo')
    chk('los ocho tipos de la base, con su nombre legible', ['ganancias', 'iva', 'iibb', 'suss', 'sircreb', 'percepcion_iva', 'percepcion_iibb', 'otra'].every(k => tipos.includes(`value="${k}"`)) && /Percepción de IIBB/.test(tipos))
    chk('los cuatro orígenes de la base', ['cliente', 'banco', 'proveedor', 'otro'].every(k => html(S, 'ad-ret-origenes').includes(`data-ret-origen="${k}"`)))
    chk('el importe con enlazarCampoNumero de 2 decimales, nunca type=number',
      /enlazarCampoNumero\(document\.getElementById\('ad-ret-importe'\), \{ decimales: 2 \}\)/.test(src) && /id="ad-ret-importe"/.test(src) && !/type="number"[^>]*id="ad-ret-importe"|id="ad-ret-importe"[^>]*type="number"/.test(src))
    const T = nuevo({ barra: null })
    T.abrirCargaRet()
    chk('con "Todas" y más de una empresa, hay que elegirla', T.estado.retenciones.carga.empresaId === '')
  }

  // ── Cargar: validar, avisar y los parámetros ───────────────────────────
  {
    const S = nuevo({ barra: 'u-n' })
    S.abrirCargaRet()
    const c = S.estado.retenciones.carga
    const hoy = S.hoyArgentina()
    chk('sin tipo: lo pide', S.validarCargaRet({ ...c }) === 'Elegí el tipo de retención.')
    chk('fecha futura: la rechaza (el texto de la base)', S.validarCargaRet({ ...c, fecha: '2999-01-01', tipo: 'iva', importe: 5, origen: 'otro' }) === 'La fecha es obligatoria y no puede ser futura.')
    chk('importe 0: lo rechaza', S.validarCargaRet({ ...c, tipo: 'iva', importe: 0, origen: 'otro' }) === 'El importe tiene que ser mayor a cero.')
    chk('sin origen: lo pide', S.validarCargaRet({ ...c, tipo: 'iva', importe: 5, origen: '' }) === 'Elegí quién la hizo.')
    chk('cliente sin elegir: lo pide', S.validarCargaRet({ ...c, tipo: 'iva', importe: 5, origen: 'cliente' }) === 'Elegí el cliente que hizo la retención.')
    chk('sin empresa: la pide', S.validarCargaRet({ ...c, empresaId: '' }) === 'Elegí la empresa.')
    chk('proveedor: todo bien', S.validarCargaRet({ ...c, tipo: 'ganancias', importe: 5, origen: 'proveedor' }) === null)

    const cli = { ...c, tipo: 'percepcion_iibb', importe: 1500, origen: 'cliente', cliente: { id: 'c1', nombre: 'Anatolia', apodo: '' },
      certificado: ' 0001-00012345 ', jurisdiccion: ' Córdoba ', detalle: '' }
    const [n1, p1] = S.parametrosRet(cli)
    chk('cliente: registrar_retencion con los parámetros EXACTOS', n1 === 'registrar_retencion' && JSON.stringify(p1) === JSON.stringify({
      p_unidad_negocio_id: 'u-n', p_fecha: hoy, p_tipo: 'percepcion_iibb', p_importe: 1500, p_origen: 'cliente', p_cliente_id: 'c1',
      p_numero_certificado: '0001-00012345', p_jurisdiccion: 'Córdoba', p_detalle: null }), JSON.stringify(p1))
    chk('el aviso antes de confirmar: "Baja la deuda de X en $ …"', S.avisoCargaRet(cli) === 'Baja la deuda de Anatolia en $\u00a01.500,00.')
    const [, p2] = S.parametrosRet({ ...cli, tipo: 'ganancias', origen: 'proveedor' })
    chk('proveedor: sin cliente y sin jurisdicción (Ganancias no la lleva)', p2.p_cliente_id === null && p2.p_jurisdiccion === null && p2.p_origen === 'proveedor')
    chk('proveedor: el aviso dice que no mueve ninguna cuenta', /No mueve ninguna cuenta/.test(S.avisoCargaRet({ ...cli, origen: 'proveedor' })))
    chk('el certificado es TEXTO tal cual (no se le pone formato de número)', S.parametrosRet({ ...cli, certificado: '000123456' })[1].p_numero_certificado === '000123456')

    S.estado.retenciones.cuentasBanco = { lista: [{ id: 'cta-1', nombre: 'Banco Macro ' + MAL, unidad_negocio_id: 'u-n' }, { id: 'cta-2', nombre: 'Galicia', unidad_negocio_id: 'u-d' }], error: null }
    const bco = { ...c, tipo: 'sircreb', importe: 845.75, origen: 'banco', cuentaId: 'cta-1', jurisdiccion: 'Córdoba', detalle: ' extracto ', certificado: 'NO-VA' }
    const [n3, p3] = S.parametrosRet(bco)
    chk('banco: registrar_retencion_banco con los parámetros EXACTOS (sin certificado)', n3 === 'registrar_retencion_banco' && JSON.stringify(p3) === JSON.stringify({
      p_cuenta_id: 'cta-1', p_fecha: hoy, p_tipo: 'sircreb', p_importe: 845.75, p_jurisdiccion: 'Córdoba', p_detalle: 'extracto' }), JSON.stringify(p3))
    chk('banco: el aviso "Se descuenta $ … de <cuenta>"', S.avisoCargaRet(bco) === 'Se descuenta $\u00a0845,75 de Banco Macro ' + MAL + '.')
    chk('banco: una cuenta de otra empresa no vale', S.validarCargaRet({ ...bco, cuentaId: 'cta-2' }) === 'Elegí la cuenta del banco (en pesos, de una empresa).')
    S.estado.retenciones.carga = bco
    S.pintarCargaRet()
    const sel = html(S, 'ad-ret-cuenta')
    chk('banco: solo las cuentas de la empresa elegida, escapadas', /value="cta-1"/.test(sel) && !/cta-2/.test(sel) && !sel.includes('<img src=x'))
    chk('banco: el certificado no se pide (la base no lo guarda)', S.__els.get('ad-ret-campo-certificado').hidden === true)
    chk('SIRCREB pide jurisdicción', S.__els.get('ad-ret-campo-jurisdiccion').hidden === false)
    chk('el aviso se ve, como texto (no HTML)', S.__els.get('ad-ret-aviso').hidden === false && texto(S, 'ad-ret-aviso').includes('<img src=x'))
    S.estado.retenciones.carga = { ...bco, tipo: 'ganancias', origen: 'otro' }
    S.pintarCargaRet()
    chk('Ganancias no pide jurisdicción', S.__els.get('ad-ret-campo-jurisdiccion').hidden === true)
    chk('Ganancias no manda jurisdicción aunque se haya escrito', S.parametrosRet({ ...bco, tipo: 'ganancias', origen: 'otro' })[1].p_jurisdiccion === null)
    for (const tipo of ['iibb', 'percepcion_iibb']) chk(`${tipo} manda la jurisdicción`, S.parametrosRet({ ...bco, tipo, origen: 'otro' })[1].p_jurisdiccion === 'Córdoba')
  }

  // ── Cargar: guardar ─────────────────────────────────────────────────────
  {
    let resolver
    const S = nuevo({ barra: 'u-n', rpc: (n) => n === 'registrar_retencion' ? new Promise(r => { resolver = r }) : undefined })
    S.abrirCargaRet()
    // Un formulario a medio llenar: no llama a la base y lo dice pegado.
    await S.guardarRetencion()
    chk('incompleto: no llama a la base y dice qué falta', !rpcs(S, 'registrar_retencion').length && texto(S, 'ad-ret-error') === 'Elegí el tipo de retención.' && S.__els.get('ad-ret-error').hidden === false)
    S.__els.get('ad-ret-empresa').value = 'u-n'
    S.__els.get('ad-ret-fecha').value = S.hoyArgentina()
    S.__els.get('ad-ret-tipo').value = 'ganancias'
    S.ponerNumero(S.__els.get('ad-ret-importe'), 2500)
    S.__els.get('ad-ret-certificado').value = 'G-1'
    S.elegirOrigenRet('proveedor')
    const p1 = S.guardarRetencion()
    const p2 = S.guardarRetencion()
    chk('un doble toque manda UNA vez', rpcs(S, 'registrar_retencion').length === 1)
    chk('lee el importe del campo (2 decimales)', rpcs(S, 'registrar_retencion')[0]?.[1]?.p_importe === 2500)
    chk('mientras manda, el botón se traba', S.__els.get('ad-ret-guardar').disabled === true)
    resolver({ data: null, error: { message: 'No tenés permiso para cargar retenciones. ' + MAL } })
    await p1; await p2; await esperar()
    chk('el error de la base va TAL CUAL, pegado al botón', texto(S, 'ad-ret-error') === 'No tenés permiso para cargar retenciones. ' + MAL && S.__els.get('ad-ret-guardar').disabled === false)
  }
  {
    const S = nuevo({ barra: 'u-n', rpc: (n) => n === 'registrar_retencion' ? { data: 'nueva', error: null } : undefined })
    await S.mostrarRetenciones()
    await esperar()
    S.abrirCargaRet()
    S.__els.get('ad-ret-empresa').value = 'u-n'
    S.__els.get('ad-ret-fecha').value = S.hoyArgentina()
    S.__els.get('ad-ret-tipo').value = 'iva'
    S.ponerNumero(S.__els.get('ad-ret-importe'), 300)
    S.elegirOrigenRet('otro')
    await S.guardarRetencion()
    await esperar()
    chk('cargada: avisa, cierra el panel y vuelve a leer', S.__llamadas.exitos.some(m => /Retención cargada/.test(m)) && S.estado.retenciones.carga === null &&
      S.__els.get('ad-ret-carga').hidden === true && rpcs(S, 'retenciones_resumen').length === 2)
  }

  // ── El buscador de clientes ─────────────────────────────────────────────
  {
    const S = nuevo({ barra: 'u-n', rpc: (n, p) => n === 'buscar_clientes' ? { data: [
      { cliente_id: 'c1', nombre: 'Distribuidora Anatolia ' + MAL, razon_social: 'ANATOLIA SRL', localidad: 'Córdoba', unidad_negocio_id: 'u-n', activo: true, apodos: ['el Turco'], apodo_coincide: 'el Turco' },
      { cliente_id: 'c9' + MAL, nombre: 'Turco Nueve', razon_social: 'TURCO ' + MAL, localidad: null, unidad_negocio_id: 'u-n', activo: true, apodos: [], apodo_coincide: null },
      { cliente_id: 'cx', nombre: 'Otro de Dolce', unidad_negocio_id: 'u-d', activo: true },
      { cliente_id: 'cy', nombre: 'Turco Apagado', unidad_negocio_id: 'u-n', activo: false },
    ], error: null } : undefined })
    S.abrirCargaRet()
    S.elegirOrigenRet('cliente')
    chk('elegir "Un cliente" muestra el buscador', S.__els.get('ad-ret-campo-cliente').hidden === false)
    S.buscarClienteRet('t')
    chk('con una letra no busca y lo dice', !rpcs(S, 'buscar_clientes').length && S.estado.retenciones.carga.remoto === null && /al menos 2 letras/.test(html(S, 'ad-ret-cliente-resultados')))
    S.buscarClienteRet('turco')
    chk('mientras espera dice "Buscando…"', /Buscando/.test(html(S, 'ad-ret-cliente-resultados')))
    await S.consultarClientesRet(S.estado.retenciones.carga)
    const b = rpcs(S, 'buscar_clientes')[0]?.[1]
    chk('busca con buscar_clientes y la EMPRESA de la retención', JSON.stringify(b) === JSON.stringify({ p_busqueda: 'turco', p_unidad_negocio_id: 'u-n' }), JSON.stringify(b))
    const r = html(S, 'ad-ret-cliente-resultados')
    chk('muestra el apodo que coincidió, escapado', /Distribuidora Anatolia &quot;&gt;&lt;img src=x onerror=alert\(1\)&gt; · el Turco/.test(r) && !r.includes('<img src=x'))
    chk('solo los activos de esa empresa', !/data-ret-cliente="cx"/.test(r) && !/data-ret-cliente="cy"/.test(r))
    S.elegirClienteRet('c1')
    const c = S.estado.retenciones.carga
    chk('elegir lo deja puesto con su apodo', c.cliente?.id === 'c1' && c.cliente.apodo === 'el Turco' && /ad-ret-elegido/.test(html(S, 'ad-ret-cliente-elegido')))
    chk('elegido, el buscador se esconde', S.__els.get('ad-ret-cliente-buscar').hidden === true)
    chk('el elegido, escapado', !html(S, 'ad-ret-cliente-elegido').includes('<img src=x') && /Distribuidora Anatolia &quot;&gt;/.test(html(S, 'ad-ret-cliente-elegido')))
    chk('el id y la razón social de otro resultado, escapados', /data-ret-cliente="c9&quot;&gt;&lt;img/.test(r) && /TURCO &quot;&gt;/.test(r))
    chk('el apodo NO se muestra si el nombre ya coincide', S.apodoMostrarRet({ nombre: 'Turco SRL', apodo_coincide: 'el Turco' }, 'turco') === '')
    S.cambiarClienteRet()
    chk('"Cambiar" suelta el cliente', S.estado.retenciones.carga.cliente === null)
    // Otra empresa: el cliente elegido era de la anterior.
    S.buscarClienteRet('turco')
    await S.consultarClientesRet(S.estado.retenciones.carga)
    S.elegirClienteRet('c1')
    chk('(se volvió a elegir)', S.estado.retenciones.carga.cliente?.id === 'c1')
    S.__els.get('ad-ret-empresa').value = 'u-d'
    S.leerFormRet()
    chk('cambiar de empresa suelta el cliente y la cuenta', S.estado.retenciones.carga.cliente === null && S.estado.retenciones.carga.cuentaId === '')
  }
  {
    // Sin permiso de buscar en la base (null): la lista local de la empresa.
    const S = nuevo({ barra: 'u-n', rpc: (n) => n === 'buscar_clientes' ? { data: null, error: null } : undefined })
    S.__tablas.clientes = (f) => ({ data: [{ id: 'k1', nombre: 'Kiosco Pepe', razon_social: null, apodos: ['Pepito ' + MAL], unidad_negocio_id: 'u-n' }], error: null })
    S.abrirCargaRet()
    S.elegirOrigenRet('cliente')
    S.buscarClienteRet('pepito')
    await S.consultarClientesRet(S.estado.retenciones.carga)
    const r = html(S, 'ad-ret-cliente-resultados')
    chk('sin permiso de buscar: lo dice y busca en los clientes que ve', /no se puede buscar en la base/.test(r) && /data-ret-cliente="k1"/.test(r))
    chk('la local muestra el apodo, escapado', /Kiosco Pepe · Pepito &quot;&gt;/.test(r) && !r.includes('<img src=x'))
    const q = S.__llamadas.consultas.find(x => x[0] === 'clientes')
    chk('la local lee los clientes ACTIVOS de esa empresa', !!q && q[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-n') && q[1].some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === true))
  }

  // ── Las cuentas de banco ────────────────────────────────────────────────
  {
    const S = nuevo({ barra: 'u-n' })
    S.__tablas.v_empleados_publico = [{ id: 'emp-empresa' }]
    S.__tablas.cuentas_caja = [
      { id: 'a', nombre: 'Macro', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-n', empleado_id: 'emp-empresa', activa: true },
      { id: 'b', nombre: 'De una persona', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-n', empleado_id: 'emp-x', activa: true },
      { id: 'c', nombre: 'Dólares', medio: 'banco', moneda: 'USD', unidad_negocio_id: 'u-n', empleado_id: 'emp-empresa', activa: true },
      { id: 'd', nombre: 'Vieja', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-n', empleado_id: 'emp-empresa', activa: false },
      { id: 'e', nombre: 'Robot', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-p', empleado_id: 'emp-empresa', activa: true },
    ]
    await S.leerCuentasBancoRet()
    const ids = S.estado.retenciones.cuentasBanco.lista.map(x => x.id).join(',')
    chk('solo los bancos de la Empresa, activos, en pesos y sin la fábrica de pruebas', ids === 'a', ids)
    const q = S.__llamadas.consultas.find(x => x[0] === 'cuentas_caja')
    chk('la consulta pide banco, ARS y activa', ['medio', 'moneda', 'activa'].every(k => q[1].some(f => f[0] === 'eq' && f[1] === k)))
  }

  // ── La cuenta del cliente ───────────────────────────────────────────────
  {
    const S = nuevo()
    chk('la etiqueta del tipo: "Retención"', S.ETIQUETA_MOVIMIENTO.retencion === 'Retención')
    chk('el detalle con el tipo legible y el certificado',
      S.detalleMovimiento({ tipo: 'retencion', detalle: 'Retención percepcion_iibb · cert. 0001-00012345' }, new Map()) === 'Retención Percepción de IIBB · cert. 0001-00012345')
    chk('la anulación (un ajuste) también dice el tipo legible',
      S.detalleMovimiento({ tipo: 'ajuste', detalle: 'Se anuló la retención iibb: duplicada' }, new Map()) === 'Se anuló la retención Ingresos Brutos: duplicada')
    chk('un tipo que no se conoce queda tal cual', S.detalleRetencion('Retención nueva_cosa · cert. 1') === 'Retención nueva_cosa · cert. 1')
    chk('otro texto no se toca', S.detalleRetencion('Deuda de agosto') === 'Deuda de agosto')
    chk('sin detalle, la etiqueta del tipo', S.detalleMovimiento({ tipo: 'retencion', detalle: null }, new Map()) === 'Retención')
  }

  // ── El Excel ──────────────────────────────────────────────────────────
  {
    const S = nuevo()
    const f = S.filasExcelRet(LISTA)
    chk('Excel: los encabezados', f[0].join('|') === 'Empresa|Fecha|Tipo|Importe|Origen|Cliente|N° de certificado|Jurisdicción|Detalle|Cargó|Estado|Motivo de la anulación')
    chk('Excel: el importe como NÚMERO, la fecha dd/mm/aaaa, el tipo legible', f[1][3] === 1200 && f[1][1] === '10/10/2026' && f[1][2] === 'Percepción de IIBB')
    chk('Excel: el certificado como TEXTO tal cual', f[1][6] === '0001-00012345')
    chk('Excel: un certificado de puros números sigue siendo TEXTO (con sus ceros)', S.filasExcelRet([{ ...LISTA[0], numero_certificado: '000123' }])[1][6] === '000123')
    chk('Excel: un importe ausente queda vacío (nunca 0)', f[2][3] === '')
    chk('Excel: una anulada dice "Anulada" y su motivo', f[4][10] === 'Anulada' && /^Duplicada/.test(f[4][11]) && f[1][10] === 'Vigente' && f[1][11] === '')
    const t = S.filasExcelTotalesRet(POR_TIPO)
    chk('Excel: los totales por tipo, el ausente vacío', t[1][2] === 12500.5 && t[3][2] === '')
    S.ret().desde = '2026-10-01'
    S.ret().hasta = '2026-10-13'
    chk('Excel: el nombre del archivo con el período', S.nombreArchivoRet(S.estado.retenciones) === 'Retenciones 01-10-2026 a 13-10-2026.xlsx')
    await S.exportarRetenciones()
    chk('Excel: sin leer todavía, lo dice', /Todavía no se leyeron/.test(texto(S, 'ad-ret-exportar-error')))
    S.estado.retenciones.datos = { por_tipo: [], lista: [] }
    await S.exportarRetenciones()
    chk('Excel: sin retenciones, lo dice', /No hay retenciones en este período/.test(texto(S, 'ad-ret-exportar-error')))
    chk('Excel: SheetJS se carga al usarlo (descargarPlanilla)', /await descargarPlanilla\(nombreArchivoRet\(r\), \[/.test(src))
  }
}

// Una suite que se cuelga (un await que nunca vuelve) terminaría con código 0
// sin decir nada: se dice y da rojo.
let terminada = false
process.on('beforeExit', () => { if (!terminada) { console.log('  ✗ la suite se colgó: una promesa nunca volvió'); process.exit(1) } })
pruebas().then(() => { terminada = true; fin() }, (e) => { terminada = true; console.error('EXCEPCIÓN:', e); process.exit(1) })
