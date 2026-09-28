// Las sesiones abiertas y "Cerrar todas" (js/sesiones.js, 27/09/2026). Se
// EJECUTAN sus funciones reales con una base falsa y un DOM falso:
//  - el dispositivo legible ("Chrome en Android") y los momentos;
//  - el user agent y la IP (los manda quien se conecta) van escapados;
//  - el motivo (3 letras o más) y la confirmación antes de cerrar;
//  - lo que va a la base (sesiones_de / cerrar_sesiones) y sus errores tal cual;
//  - cerrar las PROPIAS lleva al login con "Tu sesión fue cerrada…";
//  - dónde se abre: Accesos (cada usuario, solo super_admin), el menú de
//    perfil del dashboard y la barra lateral (las propias).
//
//   node pruebas/test-sesiones.js
//   ARCHIVO_TEST=<copia de js/sesiones.js>

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'sesiones.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['escSes', 'dispositivoLegible', 'partesAr', 'momentoSesion', 'motivoValido', 'htmlListaSesiones', 'textoConfirmar',
  'htmlPanelSesiones', 'leerSesiones', 'cerrarSesionesDe', 'pedirCerrar', 'confirmarCerrar', 'abrirPanelSesiones']
function construir() {
  let c = 'var abierto = null\n'
  for (const k of ['LARGO_MINIMO_MOTIVO_SESIONES', 'ZONA_AR']) c += extraerConst(src, k)
  for (const f of FUNCIONES) c += extraerFn(src, f) + '\n'
  c += `return { ${FUNCIONES.join(', ')} }`
  return new Function(c)()
}
const S = construir()
const AHORA = new Date('2026-09-27T18:00:00Z')   // 15:00 en Argentina

// ── El dispositivo ─────────────────────────────────────────────────────────
const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-X135) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  samsung: 'Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  node: 'node-fetch/1.0',
}
chk('Chrome en Android', S.dispositivoLegible(UA.chromeAndroid) === 'Chrome en Android', S.dispositivoLegible(UA.chromeAndroid))
chk('Safari en iPhone', S.dispositivoLegible(UA.safariIphone) === 'Safari en iPhone', S.dispositivoLegible(UA.safariIphone))
chk('Edge en Windows (no Chrome)', S.dispositivoLegible(UA.edgeWindows) === 'Edge en Windows')
chk('Firefox en Linux', S.dispositivoLegible(UA.firefoxLinux) === 'Firefox en Linux')
chk('Samsung Internet en Android (no Chrome)', S.dispositivoLegible(UA.samsung) === 'Samsung Internet en Android')
chk('Chrome en Mac', S.dispositivoLegible(UA.chromeMac) === 'Chrome en Mac')
chk('lo que no es un navegador: Otro programa', S.dispositivoLegible(UA.node) === 'Otro programa')
chk('sin nada: Dispositivo desconocido', S.dispositivoLegible(null) === 'Dispositivo desconocido' && S.dispositivoLegible('  ') === 'Dispositivo desconocido')

// ── Los momentos (hora de Argentina) ───────────────────────────────────────
chk('recién', S.momentoSesion('2026-09-27T17:59:40Z', AHORA) === 'recién')
chk('hace N min', S.momentoSesion('2026-09-27T17:48:00Z', AHORA) === 'hace 12 min')
chk('hoy a las (hora argentina)', S.momentoSesion('2026-09-27T12:05:00Z', AHORA) === 'hoy a las 09:05', S.momentoSesion('2026-09-27T12:05:00Z', AHORA))
chk('otro día: fecha y hora', S.momentoSesion('2026-09-25T15:30:00Z', AHORA) === '25/09/2026 a las 12:30', S.momentoSesion('2026-09-25T15:30:00Z', AHORA))
chk('pasada la medianoche UTC sigue siendo hoy en Argentina', S.momentoSesion('2026-09-28T01:00:00Z', new Date('2026-09-28T02:30:00Z')) === 'hoy a las 22:00')
chk('una fecha que no se lee: —, nunca inventada', S.momentoSesion(null, AHORA) === '—' && S.momentoSesion('no', AHORA) === '—')

// ── La lista: escapada ─────────────────────────────────────────────────────
{
  const malo = '<img src=x onerror=alert(1)>'
  const h = S.htmlListaSesiones([
    { creada: '2026-09-27T12:00:00Z', ultima_actividad: '2026-09-27T17:50:00Z', dispositivo: UA.chromeAndroid, ip: '181.1.2.3' },
    { creada: '2026-09-27T12:00:00Z', ultima_actividad: '2026-09-27T17:50:00Z', dispositivo: 'X' + malo, ip: '"><b>' },
  ], AHORA)
  chk('la lista dice el dispositivo legible', h.includes('Chrome en Android'))
  chk('la lista dice la última actividad y la IP', h.includes('Última actividad: hace 10 min · IP 181.1.2.3'))
  chk('la IP que manda el que se conecta va escapada', !h.includes('"><b>') && h.includes('&quot;&gt;&lt;b&gt;'))
  chk('sin sesiones lo dice', /No hay sesiones abiertas/.test(S.htmlListaSesiones([], AHORA)))
  const hu = S.htmlListaSesiones([{ dispositivo: 'Safari' + '/1 ' + malo, ip: malo, creada: null, ultima_actividad: null }], AHORA)
  chk('nada de la base entra crudo', !/<img|<b>/.test(hu))
}

// ── El panel ───────────────────────────────────────────────────────────────
{
  const base = { empleadoId: 'e2', nombre: 'Ana <b>Pérez</b>', propia: false, filas: null, error: null, motivo: '', paso: 'ver', errorMotivo: null, errorCierre: null, hecho: null }
  let h = S.htmlPanelSesiones({ ...base }, AHORA)
  chk('mientras lee: Cargando…', h.includes('Cargando…'))
  chk('el título de otra persona lleva su nombre, escapado', h.includes('Sesiones de Ana &lt;b&gt;Pérez&lt;/b&gt;') && !h.includes('<b>Pérez'))
  chk('se puede cerrar el panel (44 px, con rótulo)', /data-accion="cerrar-panel" aria-label="Cerrar"/.test(h))
  h = S.htmlPanelSesiones({ ...base, error: 'Solo un <x> super_admin' }, AHORA)
  chk('el error de la base, tal cual y escapado, con reintentar', h.includes('Solo un &lt;x&gt; super_admin') && h.includes('data-accion="reintentar"'))
  const filas = [{ creada: AHORA.toISOString(), ultima_actividad: AHORA.toISOString(), dispositivo: UA.chromeAndroid, ip: '1.1.1.1' }]
  h = S.htmlPanelSesiones({ ...base, filas }, AHORA)
  chk('de otro: "Cerrar todas sus sesiones", en rojo', /class="btn sesiones__boton sesiones__boton--peligro" data-accion="pedir-cerrar">Cerrar todas sus sesiones</.test(h))
  chk('pide el motivo', h.includes('<textarea id="sesiones-motivo"'))
  chk('de otro: sin la nota de la propia', !h.includes('También se cierra esta sesión'))
  h = S.htmlPanelSesiones({ ...base, propia: true, filas }, AHORA)
  chk('las propias: "Mis sesiones abiertas" y "Cerrar todas mis sesiones"', h.includes('Mis sesiones abiertas') && h.includes('>Cerrar todas mis sesiones<'))
  chk('las propias: avisa que también cierra la actual', h.includes('También se cierra esta sesión: vas a tener que volver a entrar.'))
  h = S.htmlPanelSesiones({ ...base, filas: [] }, AHORA)
  chk('sin sesiones no hay botón de cerrar', !h.includes('pedir-cerrar'))
  h = S.htmlPanelSesiones({ ...base, filas, paso: 'confirmar' }, AHORA)
  chk('confirmar: la pregunta con el nombre, escapado', h.includes('¿Cerrar la sesión abierta de Ana &lt;b&gt;Pérez&lt;/b&gt;?'))
  chk('confirmar: "Sí, cerrarlas" y "Volver"', h.includes('data-accion="confirmar-cerrar">Sí, cerrarlas<') && h.includes('data-accion="volver">Volver<'))
  h = S.htmlPanelSesiones({ ...base, filas, paso: 'cerrando' }, AHORA)
  chk('cerrando: los botones se traban', /data-accion="confirmar-cerrar" disabled>Cerrando…/.test(h) && /data-accion="volver" disabled/.test(h))
  h = S.htmlPanelSesiones({ ...base, filas: [...filas, ...filas], paso: 'confirmar', propia: true }, AHORA)
  chk('confirmar las propias: dice que también se cierra esta', h.includes('¿Cerrar las 2 sesiones abiertas? También se cierra esta: vas a tener que volver a entrar.'))
  h = S.htmlPanelSesiones({ ...base, filas: [], hecho: 'Listo: se cerraron 3 sesiones.' }, AHORA)
  chk('después: el resultado', h.includes('Listo: se cerraron 3 sesiones.') && h.includes('role="status"'))
}

// ── Motivo y confirmación ─────────────────────────────────────────────────
{
  const e = { empleadoId: 'e2', motivo: ' ab ', paso: 'ver' }
  S.pedirCerrar(e)
  chk('sin motivo (menos de 3 letras) no pasa a confirmar', e.paso === 'ver' && /3 letras/.test(e.errorMotivo))
  e.motivo = 'Se fue de la empresa'
  S.pedirCerrar(e)
  chk('con motivo, pide confirmar', e.paso === 'confirmar' && e.errorMotivo === null)
}

// ── Contra la base ─────────────────────────────────────────────────────────
function sbFalso({ sesiones = [], errorSesiones = null, cerradas = 2, errorCerrar = null } = {}) {
  const llamadas = []
  return {
    llamadas,
    rpc(nombre, params) {
      llamadas.push([nombre, params])
      if (nombre === 'sesiones_de') return Promise.resolve(errorSesiones ? { data: null, error: errorSesiones } : { data: sesiones, error: null })
      if (nombre === 'cerrar_sesiones') return Promise.resolve(errorCerrar ? { data: null, error: errorCerrar } : { data: { sesiones_cerradas: cerradas }, error: null })
      return Promise.resolve({ data: null, error: { message: 'rpc desconocida' } })
    },
  }
}

esperas.push((async () => {
  {
    const sb = sbFalso({ sesiones: [{ ip: '1' }] })
    const r = await S.leerSesiones(sb, 'e2')
    chk('lee sesiones_de con p_empleado_id', sb.llamadas[0][0] === 'sesiones_de' && sb.llamadas[0][1].p_empleado_id === 'e2' && r.filas.length === 1)
    const r2 = await S.leerSesiones(sbFalso({ errorSesiones: { message: 'Sin permiso.' } }), 'e2')
    chk('si falla: sin filas y el mensaje de la base', r2.filas === null && r2.error === 'Sin permiso.')
  }
  {
    const sb = sbFalso({ cerradas: 3 })
    const e = { empleadoId: 'e2', nombre: 'Ana', propia: false, motivo: '  Se fue  ', paso: 'confirmar', filas: [{}], hecho: null }
    const r = await S.confirmarCerrar(e, sb)
    const p = sb.llamadas[0]
    chk('cierra con cerrar_sesiones(p_empleado_id, p_motivo) y el motivo sin espacios', p[0] === 'cerrar_sesiones' && p[1].p_empleado_id === 'e2' && p[1].p_motivo === 'Se fue')
    chk('de otro: recarga y dice cuántas cerró', r === 'recargar' && e.hecho === 'Listo: se cerraron 3 sesiones.' && e.paso === 'ver' && e.motivo === '')
  }
  {
    const e = { empleadoId: 'e2', nombre: 'Ana', propia: false, motivo: 'Se fue', paso: 'confirmar' }
    const r = await S.confirmarCerrar(e, sbFalso({ errorCerrar: { message: 'Solo un super_admin puede cerrar las sesiones de otra persona.' } }))
    chk('si la base rechaza: no cierra, vuelve a confirmar y dice el mensaje TAL CUAL', r === null && e.paso === 'confirmar' && e.errorCierre === 'Solo un super_admin puede cerrar las sesiones de otra persona.')
  }
  {
    const e = { empleadoId: 'e1', nombre: 'Yo', propia: true, motivo: 'Perdí el celular', paso: 'confirmar' }
    const r = await S.confirmarCerrar(e, sbFalso({ cerradas: 2 }))
    chk('las propias: hay que ir al login', r === 'cortar')
  }
  {
    const sb = sbFalso()
    const e = { empleadoId: 'e2', motivo: 'Se fue', paso: 'ver' }
    const r = await S.confirmarCerrar(e, sb)
    chk('sin haber confirmado no se llama a la base', r === null && sb.llamadas.length === 0)
    const e2 = { empleadoId: 'e2', motivo: 'x', paso: 'confirmar' }
    await S.confirmarCerrar(e2, sb)
    chk('sin motivo tampoco', sb.llamadas.length === 0)
  }
  // El panel en una página falsa.
  {
    const hechos = []
    const doc = docFalso()
    const sb = sbFalso({ sesiones: [{ creada: AHORA.toISOString(), ultima_actividad: AHORA.toISOString(), dispositivo: UA.chromeAndroid, ip: '1.2.3.4' }] })
    const ab = await S.abrirPanelSesiones({ sb, empleadoId: 'e1', nombre: 'Yo', propia: true, doc, alCortar: () => hechos.push('cortar') })
    const fondo = doc.body.hijos[0]
    const panel = fondo.hijos[0]
    chk('el panel es un diálogo modal con título', panel.atributos.role === 'dialog' && panel.atributos['aria-modal'] === 'true' && panel.atributos['aria-labelledby'] === 'sesiones-titulo')
    chk('muestra la sesión leída', panel.innerHTML.includes('Chrome en Android'))
    panel.motivo.valor('Perdí el celular')
    await fondo.clic('pedir-cerrar')
    chk('pide confirmar', panel.innerHTML.includes('Sí, cerrarlas'))
    await fondo.clic('confirmar-cerrar')
    chk('al confirmar las propias: al login (con el aviso de salud.js)', hechos.join() === 'cortar')
    chk('y se llamó a cerrar_sesiones', sb.llamadas.some(l => l[0] === 'cerrar_sesiones'))
    chk('devuelve el panel abierto', !!ab)
    doc.tecla('Escape')
    chk('mientras se cierran las sesiones, Escape no corta a la mitad', doc.body.hijos.length === 1)
  }
  {
    const doc = docFalso()
    await S.abrirPanelSesiones({ sb: sbFalso(), empleadoId: 'e2', nombre: 'Ana', propia: false, doc, alCortar: () => {} })
    chk('abre un solo panel', doc.body.hijos.length === 1)
    await S.abrirPanelSesiones({ sb: sbFalso(), empleadoId: 'e3', nombre: 'Otro', propia: false, doc, alCortar: () => {} })
    chk('abrir otro cierra el anterior (nunca dos paneles)', doc.body.hijos.length === 1)
    doc.tecla('Escape')
    chk('Escape cierra el panel', doc.body.hijos.length === 0)
  }
})())

function docFalso() {
  const listeners = []
  const body = { hijos: [], appendChild(n) { this.hijos.push(n); n.padre = this } }
  function el() {
    let html = ''
    const n = {
      hijos: [], atributos: {}, className: '', listeners: {},
      setAttribute(k, v) { this.atributos[k] = String(v) },
      appendChild(h) { this.hijos.push(h); h.padre = this },
      remove() { if (this.padre) this.padre.hijos = this.padre.hijos.filter(x => x !== this) },
      addEventListener(t, f) { (this.listeners[t] ??= []).push(f) },
      get innerHTML() { return html }, set innerHTML(v) { html = v; this.motivo = null },
      motivo: null,
      querySelector(sel) {
        if (sel === '#sesiones-motivo' && html.includes('id="sesiones-motivo"')) {
          const t = { value: '', l: null, addEventListener(tipo, f) { this.l = f } }
          t.valor = (v) => { t.value = v; t.l?.() }
          this.motivo = t
          return t
        }
        if (sel === '[data-accion="cerrar-panel"]') return { focus() {} }
        return null
      },
      async clic(accion) {
        const target = { closest: (s) => s === '[data-accion]' ? { dataset: { accion } } : null }
        for (const f of this.listeners.click ?? []) await f({ target })
      },
    }
    return n
  }
  return {
    body, activeElement: null,
    createElement: () => el(),
    addEventListener(t, f) { listeners.push([t, f]) },
    removeEventListener(t, f) { const i = listeners.findIndex(x => x[1] === f); if (i >= 0) listeners.splice(i, 1) },
    tecla(k) { for (const [t, f] of [...listeners]) if (t === 'keydown') f({ key: k }) },
  }
}

// ── El default: cerrar las propias va al login con el aviso ────────────────
chk('por defecto, cerrar las propias llama a sesionCortada() de salud.js', /alCortar = \(\) => sesionCortada\('cerrar_mis_sesiones'\)/.test(src) && /import \{ sesionCortada \} from '\.\/salud\.js'/.test(src))
{
  const salud = fs.readFileSync(path.join(RAIZ, 'js', 'salud.js'), 'utf8')
  chk('salud.js deja el aviso "Tu sesión fue cerrada. Volvé a iniciar sesión." para el login', salud.includes("export const MENSAJE_SESION_CERRADA = 'Tu sesión fue cerrada. Volvé a iniciar sesión.'") && /setItem\(CLAVE_AVISO_LOGIN, MENSAJE_SESION_CERRADA\)/.test(salud))
  const login = fs.readFileSync(path.join(RAIZ, 'login.html'), 'utf8')
  chk('el login lo muestra', /const avisoSesion = tomarAvisoLogin\(\)\s*\n\s*if \(avisoSesion\) mostrarAlertaError\(avisoSesion\)/.test(login))
}

// ── Dónde se abre ──────────────────────────────────────────────────────────
{
  const acc = fs.readFileSync(path.join(RAIZ, 'modulos', 'accesos.html'), 'utf8')
  chk('Accesos importa el panel compartido', acc.includes("import { abrirPanelSesiones } from '../js/sesiones.js'"))
  const linea = acc.split('\n').find(l => l.includes('btn-sesiones-usuario" data-id'))
  chk('Accesos: "Sesiones" en TODAS las tarjetas (no cuelga de ninguna condición)', !!linea && /^\s*<button type="button" class="btn btn--secundario btn-sesiones-usuario" data-id="\$\{esc\(emp\.id\)\}"/.test(linea))
  chk('Accesos: las propias se marcan como propias', /abrirPanelSesiones\(\{ sb: supabase, empleadoId: emp\.id, nombre: emp\.nombre, propia: emp\.id === estado\.miEmpleado\?\.id \}\)/.test(acc))
  chk('Accesos sigue siendo solo para super_admin', /soloSuperAdmin: true,\s*\n\s*color: 'rojo'/.test(fs.readFileSync(path.join(RAIZ, 'js', 'modulos.js'), 'utf8')) && /rol_app !== 'super_admin'/.test(acc))
  const dash = fs.readFileSync(path.join(RAIZ, 'dashboard.html'), 'utf8')
  chk('el menú de perfil tiene "Mis sesiones abiertas"', dash.includes('<button type="button" class="menu-perfil__opcion" id="btn-mis-sesiones">Mis sesiones abiertas</button>'))
  chk('el menú abre las PROPIAS', /abrirPanelSesiones\(\{ sb: supabase, empleadoId: miEmpleado\.id, nombre: nombre \|\| email, propia: true \}\)/.test(dash))
  chk('?cuenta=sesiones las abre derecho', /get\('cuenta'\) === 'sesiones'/.test(dash))
  const barra = fs.readFileSync(path.join(RAIZ, 'js', 'barra-lateral.js'), 'utf8')
  chk('la barra lateral abre las propias', /abrirPanelSesiones\(\{ sb, empleadoId: yo\.id, propia: true, doc \}\)/.test(barra) && barra.includes('id="barra-lateral-sesiones"'))
}

// ── El CSS del panel ───────────────────────────────────────────────────────
{
  const css = fs.readFileSync(path.join(RAIZ, 'css', 'main.css'), 'utf8')
  chk('el panel va sobre todo (z-index 900)', /\.sesiones-fondo \{[^}]*z-index: 900;/.test(css))
  chk('el botón de cerrar sesiones es rojo', /\.sesiones__boton--peligro \{ background: var\(--rojo\);/.test(css))
  chk('el ✕ mide 44 px', /\.sesiones__cerrar \{\s*flex: 0 0 44px; width: 44px; height: 44px;/.test(css))
}

fin()
