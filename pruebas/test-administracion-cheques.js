// LA CARTERA DE CHEQUES ADENTRO DE ADMINISTRACIÓN (26/09/2026).
//
// Lo que cambió con la mudanza (lo de la cartera en sí lo siguen probando
// test-cheques-*.js, ahora sobre su región de administracion.html):
//  - la sección Cheques aparece para quien hoy puede ver Cheques
//    (cobranzas:ver_todo o cobranzas:procesar), sin depender de una empresa;
//  - abrirla muestra la vista, esconde el selector de empresa, deja
//    ?seccion=cheques en la dirección y le avisa al módulo de la cartera;
//  - modulos/cheques.html es una redirección a esa sección, que conserva el
//    cheque pedido (?cheque=<uuid>) y nada más;
//  - la cartera ya no redirige al dashboard y su volver= apunta a cheques.html.
//
//   node pruebas/test-administracion-cheques.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { regionCheques, sinCheques, limitesCheques } = require('./fuente-cheques')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const REDIRECCION = process.env.ARCHIVO_REDIRECCION || path.join(__dirname, '..', 'modulos/cheques.html')
const redir = fs.readFileSync(REDIRECCION, 'utf8')
console.log('ARCHIVO ' + REDIRECCION + ' (' + redir.length + ' bytes)')
const { chk, fin } = arnes()

const EXTRA = `
  var history = { replaceState(s, t, u) { __llamadas.history = (__llamadas.history || []).concat([u]) } }
  function CustomEvent(tipo) { this.type = tipo }
  document.dispatchEvent = (e) => { __llamadas.eventos = (__llamadas.eventos || []).concat([e.type]) }
`
const nuevo = () => construirAdministracion(ARCHIVO, { preludioExtra: EXTRA })

// ── Quién ve la sección ────────────────────────────────────────────────────
{
  const S = nuevo()
  const cheques = S.SECCIONES.find(s => s.id === 'cheques')
  chk('hay una sección Cheques', !!cheques && cheques.global === true)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  chk('sin tareas de cobranzas NO se ve', !S.seccionesVisibles().some(s => s.id === 'cheques'))
  S.estado.misTareas = new Map([['cobranzas:procesar', null]])
  chk('con cobranzas:procesar se ve', S.seccionesVisibles().some(s => s.id === 'cheques'))
  S.estado.misTareas = new Map([['cobranzas:ver_todo', null]])
  chk('con cobranzas:ver_todo se ve', S.seccionesVisibles().some(s => s.id === 'cheques'))
  S.estado.misTareas = new Map([['cobranzas:cargar', null]])
  chk('solo con cobranzas:cargar NO (ve solo sus cheques, no una cartera)', !S.seccionesVisibles().some(s => s.id === 'cheques'))
  S.estado.misTareas = new Map()
  S.estado.miRolApp = 'super_admin'
  chk('super_admin la ve', S.seccionesVisibles().some(s => s.id === 'cheques'))
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map([['cobranzas:procesar', null]])
  S.estado.empresaId = null
  chk('no depende de la empresa: sin empresa elegida se ve igual', S.seccionesVisibles().some(s => s.id === 'cheques'))
  chk('y cuenta como sección global (deja entrar sin empresas)', S.hayGlobales() === true && S.empresasDeAdministracion().length === 0)
  S.estado.misTareas = new Map()
  chk('sin nada, no hay globales', S.hayGlobales() === false)
  chk('la portada tiene la tarjeta de Cheques', /data-seccion="cheques"/.test((S.estado.misTareas = new Map([['cobranzas:procesar', null]]), S.htmlSeccion(cheques, {}))))
  const init = sinCheques(src).slice(sinCheques(src).indexOf('async function init()'))
  chk('quien solo ve Cheques entra a Administración (no lo manda al dashboard)', /if \(!lista\.length && !hayGlobales\(\)\) \{/.test(init))
}

// ── Abrir la sección ───────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['cobranzas:procesar', null]])
  S.mostrarCheques()
  chk('abrir Cheques muestra su vista', S.estado.vista === 'ad-vista-cheques' && S.__els.get('ad-vista-cheques').hidden === false && S.__els.get('ad-vista-inicio').hidden === true)
  chk('esconde el selector de empresa (la cartera no es de una)', S.__els.get('ad-empresas').hidden === true)
  chk('deja ?seccion=cheques en la dirección', (S.__llamadas.history || []).some(u => /\?seccion=cheques$/.test(u)))
  chk('y le avisa al módulo de la cartera que arranque', (S.__llamadas.eventos || []).includes('administracion:cheques'))
  S.mostrarVista('ad-vista-inicio')
  chk('volver a la portada vuelve a mostrar el selector de empresa', S.__els.get('ad-empresas').hidden === false)
  const T = nuevo()
  T.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  T.mostrarCheques()
  chk('sin permiso, abrir Cheques lleva a la portada y no avisa nada', T.estado.vista === 'ad-vista-inicio' && !(T.__llamadas.eventos || []).length)
  const init = sinCheques(src).slice(sinCheques(src).indexOf('async function init()'))
  chk('?seccion=cheques abre la cartera al entrar', /if \(pedida === 'cheques' && seccionesVisibles\(\)\.some\(s => s\.id === 'cheques'\)\) mostrarCheques\(\)/.test(init))
  chk('el "‹ Portada" de la sección vuelve a la portada', /getElementById\('ad-cheques-volver'\)\.addEventListener\('click', \(\) => mostrarInicio\(\)\)/.test(src))
  chk('Cheques ya no es un acceso directo a otra pantalla', !/url: 'cheques\.html'/.test(sinCheques(src)))
}

// ── La región de la cartera ────────────────────────────────────────────────
{
  const l = limitesCheques(src)
  chk('la cartera vive en UNA región marcada, al final del archivo', !!l && src.slice(l.fin).split('<script').length === 1)
  const r = regionCheques(src)
  chk('la región tiene la sección, los estilos y su propio <script type="module">', /<section id="ad-vista-cheques" hidden>/.test(r) && /<style>/.test(r) && (r.match(/\n  <script type="module">\n/g) || []).length === 1)
  chk('las variables de la cartera van en la sección, no en el body', /#ad-vista-cheques \{\s*\/\* Receta de tarjeta/.test(r) && !/^\s*body \{/m.test(r))
  chk('la cartera arranca con el aviso de Administración', /document\.addEventListener\('administracion:cheques', \(\) => arrancar\(\)\)/.test(r))
  chk('y si la sección ya está abierta cuando carga', /if \(document\.getElementById\('ad-vista-cheques'\)\?\.hidden === false\) arrancar\(\)/.test(r))
  chk('volver a abrirla recarga la cartera', /if \(iniciada\) \{ refrescarTodo\(\); return \}/.test(r))
  const script = r.slice(r.indexOf('<script type="module">'))
  chk('la cartera NO redirige al dashboard (la pantalla sigue siendo de la persona)', !/dashboard\.html/.test(script))
  chk('no arranca sola al cargar (sin init() suelto)', !/\n    init\(\)\n/.test(script))
  chk('el volver= de una cobranza apunta a cheques.html (Cobranzas dice "‹ Volver a los cheques")', /urlDeCobranza\(cobranzaId, new URL\('cheques\.html', window\.location\.href\)\.href\)/.test(script))
  chk('limpiar ?cheque= deja ?seccion=cheques', /history\.replaceState\(null, '', window\.location\.pathname \+ '\?seccion=cheques'\)/.test(script))
  chk('el banner de versión no se pone dos veces', !/mostrarBannerVersion/.test(script))
}

// ── cheques.html: la redirección ───────────────────────────────────────────
{
  const ini = redir.indexOf('<script>')
  const fin2 = redir.indexOf('</script>', ini)
  chk('cheques.html tiene su script de redirección', ini !== -1 && fin2 > ini)
  const codigo = redir.slice(ini + '<script>'.length, fin2)
  const correr = (search) => {
    let destino = null
    const window = { location: { search, replace(u) { destino = u } } }
    new Function('window', 'URLSearchParams', codigo)(window, URLSearchParams)
    return destino
  }
  chk('sin nada, va a la sección Cheques de Administración', correr('') === 'administracion.html?seccion=cheques')
  const uuid = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
  chk('conserva el cheque pedido (el "Ver en Cheques" de Cobranzas)', correr('?cheque=' + uuid) === 'administracion.html?seccion=cheques&cheque=' + uuid)
  chk('un cheque que no es un uuid no se pasa', correr('?cheque=%3Cscript%3E') === 'administracion.html?seccion=cheques')
  chk('ningún otro parámetro se pasa', correr('?cheque=' + uuid + '&volver=javascript:alert(1)') === 'administracion.html?seccion=cheques&cheque=' + uuid)
  chk('usa replace (atrás no vuelve a la redirección)', /window\.location\.replace\(/.test(codigo))
  chk('sin JavaScript, igual redirige', /<noscript><meta http-equiv="refresh" content="0; url=administracion\.html\?seccion=cheques"><\/noscript>/.test(redir))
  chk('y dice a dónde se mudó', /se mudó a <a href="administracion\.html\?seccion=cheques">Administración<\/a>/.test(redir))
  chk('cheques.html ya no tiene la cartera', !/chq-contenedor|<script type="module">/.test(redir))
}

fin()
