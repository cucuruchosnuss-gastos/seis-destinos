// El HTML del tablero de resúmenes (js/tablero.js): cada estado de la tarjeta
// (cargando, error con Reintentar, sin datos, Pronto, con datos), el pie de
// "lo que hay que resolver" (urgente en bordó, "Nada pendiente", "No se pudo
// saber"), el modo acomodar (manija, tamaño, esconder, sin link), la franja y
// las escondidas. Los renders se EJECUTAN, y todo texto que viene de la base
// se prueba con HTML malicioso: una marca distinta por campo.
//
//   node pruebas/test-tablero-html.js
'use strict'

const { arnes, marca } = require('./circuito-comun')
const { construir } = require('./sandbox-tablero')

const { chk, fin } = arnes()
const S = construir()
const T = (extra = {}) => ({ clave: 'gastos', nombre: 'Gastos', url: 'modulos/gastos.html', tamano: 'mediana', ...extra })
const crudas = h => (h.match(/<b data-xss="[^"]+">/g) || []).map(x => x.match(/"([^"]+)"/)[1])

// ── Con datos ───────────────────────────────────────────────────────────────
{
  const m = {
    estado: 'ok', etiqueta: marca('etiqueta'), valor: marca('valor'), unidad: marca('unidad'), sub: marca('sub'),
    tendencia: { texto: marca('tendencia'), sube: true },
    ctx: [{ k: marca('ctx-k'), v: marca('ctx-v'), tono: 'bien' }],
    listaTitulo: marca('lista-titulo'), lista: [{ nombre: marca('lista-nombre'), v: marca('lista-v'), pct: 40 }, { nombre: 'x', v: 'y', pct: 250, tono: 'mal' }],
    maquinas: [{ nombre: marca('maq-nombre'), st: marca('maq-st'), det: marca('maq-det'), tipo: 'mal' }, { nombre: 'M1', st: 'Andando', det: 'd', tipo: 'bien' }],
    resolver: [{ n: marca('res-n'), t: marca('res-t'), url: marca('res-url'), urgente: true, origen: marca('res-origen') }, { n: 2, t: 'planillas', url: 'u' }],
    nota: marca('nota'),
  }
  const h = S.htmlTarjeta(T({ nombre: marca('nombre'), url: marca('url') }), m)
  chk('con datos: ninguna marca cruda', crudas(h).length === 0, crudas(h).join())
  for (const campo of ['etiqueta', 'valor', 'unidad', 'sub', 'tendencia', 'ctx-k', 'ctx-v', 'lista-titulo', 'lista-nombre', 'lista-v', 'maq-nombre', 'maq-st', 'maq-det', 'res-n', 'res-t', 'res-url', 'res-origen', 'nota', 'nombre', 'url']) {
    chk(`con datos: "${campo}" aparece escapado`, h.includes(`&quot;&gt;&lt;b data-xss=&quot;${campo}&quot;&gt;`), campo)
  }
  chk('la tarjeta lleva su clave (data-tarjeta) y su tamaño', h.includes('data-tarjeta="gastos"') && h.includes('tb-tarjeta--mediana'))
  chk('tocar la tarjeta abre el módulo: el nombre es el link', /<a class="tb-tarjeta__abrir" href="[^"]*">/.test(h))
  chk('la barrita no pasa del 100 %', h.includes('width: 100%') && h.includes('width: 40%'))
  chk('la barrita de lo malo, en bordó', h.includes('tb-barrita__lleno--mal'))
  chk('la máquina parada en bordó; la que anda, en verde', h.includes('tb-maquina--mal') && h.includes('tb-maquina--bien'))
  chk('la flecha que sube', h.includes('tb-tendencia--sube'))
  chk('lo urgente del pie, en bordó', /<a class="tb-res tb-res--urgente"/.test(h))
  chk('lo pendiente normal, en gris (sin --urgente)', /<a class="tb-res" href="u"/.test(h))
  chk('con renglones, no dice "Nada pendiente"', !h.includes('Nada pendiente'))
  chk('el color del módulo va solo en el ícono y las barritas (variable de la tarjeta)', h.includes('style="--tb-color: oklch('))
  chk('el ícono es el trazo del diseño (sin Lucide)', h.includes('<svg') && !h.includes('data-lucide'))
}
{
  const baja = S.htmlTarjeta(T(), { estado: 'ok', valor: '5', tendencia: { texto: '10 menos', sube: false }, resolver: [] })
  chk('la flecha que baja (bordó)', baja.includes('tb-tendencia--baja'))
  const igual = S.htmlTarjeta(T(), { estado: 'ok', valor: '5', tendencia: { texto: 'Igual', igual: true }, resolver: [] })
  chk('igual que la semana pasada: sin flecha de color', igual.includes('tb-tendencia--igual'))
}

// ── El pie ────────────────────────────────────────────────────────────────
{
  const nada = S.htmlTarjeta(T(), { estado: 'ok', valor: '$ 1', resolver: [] })
  chk('sin nada para resolver: "Nada pendiente" en verde con tilde', nada.includes('Nada pendiente') && nada.includes('tb-bien'))
  const bien = S.htmlTarjeta(T(), { estado: 'vacio', vacioMsg: 'x', resolver: [], bienMsg: marca('bien') })
  chk('el mensaje propio ("Nada por controlar") escapado', bien.includes('&quot;&gt;&lt;b data-xss=&quot;bien&quot;') && crudas(bien).length === 0)
  const pe = S.htmlTarjeta(T(), { estado: 'ok', valor: '$ 1', resolver: [], pendError: true })
  chk('si mis_pendientes falló, NO dice "Nada pendiente": dice que no se pudo saber', !pe.includes('Nada pendiente') && pe.includes('No se pudo saber qué hay pendiente.'))
  const pe2 = S.htmlTarjeta(T(), { estado: 'ok', valor: '$ 1', resolver: [{ n: 1, t: 'x', url: 'u' }], pendError: true })
  chk('con renglones propios y mis_pendientes caído, avisa que falta una parte', pe2.includes('No se pudo saber todo lo pendiente.'))
  const sin = S.htmlTarjeta(T(), { estado: 'ok', valor: '1', resolver: [], sinPie: true })
  chk('una tarjeta sin pie (Seguridad, Empleados) no afirma "Nada pendiente"', !sin.includes('tb-pie'))
}

// ── Cargando, error, sin datos, Pronto ────────────────────────────────────
{
  const c = S.htmlTarjeta(T(), { estado: 'cargando' })
  chk('cargando: los huesos grises y "Cargando…"', c.includes('tb-hueso--numero') && c.includes('Cargando…') && c.includes('aria-busy="true"'))
  chk('cargando: sin pie ni número', !c.includes('tb-pie') && !c.includes('tb-numero'))
  chk('sin modelo todavía = cargando', S.htmlTarjeta(T(), undefined).includes('Cargando…'))
  const e = S.htmlTarjeta(T({ clave: 'caja' }), { estado: 'error' })
  chk('error: "No se pudo cargar" y el texto del diseño', e.includes('No se pudo cargar') && e.includes('Puede ser la conexión. El resto del tablero anda bien.'))
  chk('error: Reintentar con la clave de SU tarjeta', e.includes('data-reintentar="caja"') && /<button type="button" class="tb-reintentar"/.test(e))
  chk('error: sin pie (no afirma nada de lo pendiente)', !e.includes('tb-pie'))
  chk('error: se anuncia (role=alert)', e.includes('role="alert"'))
  const v = S.htmlTarjeta(T(), { estado: 'vacio', etiqueta: 'Cobrado hoy', vacioMsg: marca('vacio'), ctx: [{ k: 'Últimos 7 días', v: '$ 3.120.000' }], resolver: [] })
  chk('sin datos: el guion en su cuadrado y el mensaje en palabras', v.includes('tb-vacio__marca') && v.includes('&quot;&gt;&lt;b data-xss=&quot;vacio'))
  chk('sin datos: el contexto sigue', v.includes('$ 3.120.000'))
  chk('sin datos: sin número grande (ni "$ 0")', !v.includes('tb-numero') && !v.includes('$ 0'))
  const p = S.htmlTarjeta(T({ clave: 'stock' }), { estado: 'pronto', etiqueta: 'Insumos por agotarse', prontoMsg: marca('pronto'), resolver: [] })
  chk('Pronto: la frase, escapada, en su estilo', p.includes('tb-vacio__msg--pronto') && p.includes('&quot;&gt;&lt;b data-xss=&quot;pronto') && crudas(p).length === 0)
}

// ── Modo acomodar ─────────────────────────────────────────────────────────
{
  const a = S.htmlTarjeta(T({ nombre: marca('nombre-acomodar') }), { estado: 'ok', valor: '1', resolver: [] }, { acomodar: true })
  chk('acomodar: la tarjeta NO navega (sin link)', !a.includes('tb-tarjeta__abrir') && !a.includes('href="modulos/gastos.html"'))
  chk('acomodar: la manija, con foco y su ayuda de teclado', /<button type="button" class="tb-manija" data-manija="gastos" aria-label="Mover [^"]*Enter la levanta/.test(a))
  chk('acomodar: el tamaño Chica / Mediana / Ancha, con el actual marcado', a.includes('data-tamano-de="gastos" data-tamano="chica"') && /tb-seg__op tb-seg__op--activa" data-tamano-de="gastos" data-tamano="mediana" aria-pressed="true"/.test(a))
  chk('acomodar: esconder', a.includes('data-esconder="gastos"'))
  chk('acomodar: borde punteado (clase)', a.includes('tb-tarjeta--acomodar'))
  chk('acomodar: el nombre escapado (también en los aria-label)', crudas(a).length === 0)
  const t = S.tarjetasOrdenadas(S.tarjetasPosibles({ esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }), { tablero: { ocultas: ['seguridad'] } })
  const esc = S.htmlEscondidas(t)
  chk('escondidas: la bandeja con "Mostrar"', esc.includes('Escondidas') && esc.includes('data-mostrar="seguridad"') && esc.includes('Seguridad'))
  chk('escondidas: sin ninguna, lo dice', S.htmlEscondidas([]).includes('No hay ninguna escondida.'))
  chk('escondidas: el nombre escapado', crudas(S.htmlEscondidas([{ clave: 'x', nombre: marca('esc'), oculta: true }])).length === 0)
}

// ── Las claves también se escapan (vienen del código, pero la regla es sin
//    excepciones: un atributo con una comilla se cierra y se inyecta) ────────
{
  const clave = marca('clave')
  const vistas = [
    S.htmlTarjeta(T({ clave }), { estado: 'ok', valor: '1', resolver: [] }),
    S.htmlTarjeta(T({ clave }), { estado: 'ok', valor: '1', resolver: [] }, { acomodar: true }),
    S.htmlTarjeta(T({ clave }), { estado: 'error' }),
    S.htmlTarjeta(T(), { estado: marca('estado') }),
    S.htmlTarjeta(T(), { estado: 'vacio', etiqueta: marca('etiqueta-vacio'), vacioMsg: 'x', resolver: [] }),
    S.htmlTarjeta(T(), { estado: 'pronto', etiqueta: marca('etiqueta-pronto'), prontoMsg: 'x', resolver: [] }),
    S.htmlEscondidas([{ clave, nombre: 'x', oculta: true }]),
  ]
  vistas.forEach((h, i) => chk(`una clave (o un estado) maliciosa no sale cruda (vista ${i + 1})`, crudas(h).length === 0, crudas(h).join()))
}

// ── La franja ─────────────────────────────────────────────────────────────
{
  const f = S.htmlFranja([{ n: 1, t: 'máquina parada', url: 'modulos/produccion-gestion.html' }, { n: marca('fr-n'), t: marca('fr-t'), url: marca('fr-url') }])
  chk('franja: "Para resolver ya" y cada cosa lleva a donde se resuelve', f.includes('Para resolver ya') && f.includes('href="modulos/produccion-gestion.html"'))
  chk('franja: todo escapado', crudas(f).length === 0 && f.includes('data-xss=&quot;fr-t'))
  chk('franja: vacía no dibuja nada', S.htmlFranja([]) === '' && S.htmlFranja(null) === '')
}

// ── Un null nunca termina en "$ 0" (el camino entero: cargador → HTML) ────
{
  const m = { estado: 'ok', etiqueta: 'Mi saldo', valor: S.plata(null), ctx: [{ k: 'Entró', v: S.plata(undefined) }], resolver: [] }
  const h = S.htmlTarjeta(T(), m)
  chk('un dato ausente se ve "—", nunca "$ 0"', h.includes('>—<') && !h.includes('$ 0'))
}

fin()
