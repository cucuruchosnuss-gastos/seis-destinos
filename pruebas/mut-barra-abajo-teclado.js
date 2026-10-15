// Mutaciones de test-barra-abajo-teclado.js (la barra de abajo y el teclado
// del iPhone, 15/10/2026). Ver mutar.js (mismos guards). De a una. Muta
// js/barra-lateral.js (ARCHIVO_TEST) y css/main.css (ARCHIVO_CSS).
//
//   node pruebas/mut-barra-abajo-teclado.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-barra-abajo-teclado.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'js', 'barra-lateral.js'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      // Qué abre el teclado
      { nombre: 'una casilla abre el teclado', de: "export const TIPOS_SIN_TECLADO = ['button', 'checkbox',", a: "export const TIPOS_SIN_TECLADO = ['button'," },
      { nombre: 'un select no cuenta', de: "  if (tag === 'SELECT') return true\n", a: '' },
      { nombre: 'un textarea no cuenta', de: "  return tag === 'TEXTAREA' || !TIPOS_SIN_TECLADO", a: "  return tag !== 'TEXTAREA' && !TIPOS_SIN_TECLADO" },
      { nombre: 'solo lectura abre el teclado', de: '  if (el.readOnly) return false\n', a: '' },
      { nombre: 'apagado abre el teclado', de: '  if (!el || el.disabled) return false', a: '  if (!el) return false' },
      { nombre: 'el texto editable no cuenta', de: '  if (el.isContentEditable) return true\n', a: '' },
      { nombre: 'el type en mayúsculas no se reconoce', de: "!TIPOS_SIN_TECLADO.includes(String(el.type || 'text').toLowerCase())", a: "!TIPOS_SIN_TECLADO.includes(String(el.type || 'text'))" },
      { nombre: 'cualquier cosa abre el teclado', de: "  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false\n", a: '' },
      // El desfase
      { nombre: 'el desfase cuenta con zoom', de: '  if (Math.abs((Number(vv.scale) || 1) - 1) > 0.01) return 0\n', a: '' },
      { nombre: 'el desfase sin offsetTop', de: '(Number(vv.height) + Number(vv.offsetTop))', a: '(Number(vv.height))' },
      { nombre: 'el desfase sin redondear', de: '  return Number.isFinite(d) ? Math.round(d) : 0', a: '  return Number.isFinite(d) ? d : 0' },
      { nombre: 'un número roto inventa desfase', de: '  return Number.isFinite(d) ? Math.round(d) : 0', a: '  return Math.round(d) || 1' },
      { nombre: 'la tolerancia de 2 px a 0', de: 'export const TOLERANCIA_TECLADO_PX = 2', a: 'export const TOLERANCIA_TECLADO_PX = 0' },
      // El rebote
      { nombre: 'el rebote de arriba no se reconoce', de: '  return y < 0 || y > max + 1', a: '  return y > max + 1' },
      { nombre: 'el rebote de abajo no se reconoce', de: '  return y < 0 || y > max + 1', a: '  return y < 0' },
      { nombre: 'el rebote no se respeta', de: '  if (enRebote(win, doc)) return false\n', a: '' },
      // La barra corrida
      { nombre: 'la barra escondida cuenta como corrida', de: '  if (!r || !(r.height > 0)) return false', a: '  if (!r) return false' },
      { nombre: 'la barra corrida no se mira', de: '  return Math.abs(desfaseTeclado(win)) > TOLERANCIA_TECLADO_PX || barraCorrida(win, barra)', a: '  return Math.abs(desfaseTeclado(win)) > TOLERANCIA_TECLADO_PX' },
      { nombre: 'el desfase no se mira', de: '  return Math.abs(desfaseTeclado(win)) > TOLERANCIA_TECLADO_PX || barraCorrida(win, barra)', a: '  return barraCorrida(win, barra)' },
      { nombre: 'la compu (sin barra de abajo) también recoloca', de: '  if (!(barra?.getBoundingClientRect?.()?.height > 0)) return false\n', a: '' },
      { nombre: 'con el teclado abierto también se recoloca', de: '  if (abreTeclado(doc?.activeElement)) return false\n', a: '' },
      // Recolocar
      { nombre: 'recolocar no vuelve (la página salta 1 px)', de: '  win.scrollTo(x, y > 0 ? y - 1 : y + 1)\n  win.scrollTo(x, y)\n', a: '  win.scrollTo(x, y > 0 ? y - 1 : y + 1)\n' },
      { nombre: 'recolocar no hace nada', de: '  win.scrollTo(x, y > 0 ? y - 1 : y + 1)\n  win.scrollTo(x, y)\n', a: '' },
      { nombre: 'recolocar arriba de todo sube (no hace nada)', de: '  win.scrollTo(x, y > 0 ? y - 1 : y + 1)', a: '  win.scrollTo(x, y - 1)' },
      { nombre: 'recolocar va arriba de todo', de: '  win.scrollTo(x, y > 0 ? y - 1 : y + 1)\n  win.scrollTo(x, y)\n', a: '  win.scrollTo(0, 0)\n' },
      // El vigilante
      { nombre: 'sin intentos máximos (bucle)', de: '    if (seguidas >= MAX_RECOLOCACIONES) return\n', a: '' },
      { nombre: 'los intentos no se espacian', de: '    if (pasaron < MS_ENTRE_RECOLOCACIONES) return pedir(MS_ENTRE_RECOLOCACIONES - pasaron)\n', a: '' },
      { nombre: 'arreglado no reinicia los intentos', de: '    if (!hayQueRecolocar({ win, doc, barra })) { seguidas = 0; return }', a: '    if (!hayQueRecolocar({ win, doc, barra })) return' },
      { nombre: 'otro teclado no reinicia los intentos', de: "  doc.addEventListener('focusin', ev => { if (abreTeclado(ev.target)) seguidas = 0 })\n", a: '' },
      { nombre: 'no se mira al cerrar el teclado', de: "  doc.addEventListener('focusout', ev => { if (abreTeclado(ev.target)) pedir(MS_DESPUES_DEL_TECLADO) })\n", a: '' },
      { nombre: 'cualquier focusout pide revisar', de: "  doc.addEventListener('focusout', ev => { if (abreTeclado(ev.target)) pedir(MS_DESPUES_DEL_TECLADO) })", a: "  doc.addEventListener('focusout', () => pedir(MS_DESPUES_DEL_TECLADO))" },
      { nombre: 'el resize del visualViewport no espera quieto', de: "  win.visualViewport?.addEventListener('resize', () => pedir(MS_QUIETO))", a: "  win.visualViewport?.addEventListener('resize', () => pedir(0))" },
      { nombre: 'el scroll no espera quieto (frena el envión)', de: "  win.addEventListener('scroll', () => pedir(MS_QUIETO), { passive: true })", a: "  win.addEventListener('scroll', () => pedir(0), { passive: true })" },
      { nombre: 'el scroll no se mira', de: "  win.addEventListener('scroll', () => pedir(MS_QUIETO), { passive: true })\n", a: '' },
      { nombre: 'al volver a la página no se mira', de: "  win.addEventListener('pageshow', () => pedir(0))\n", a: '' },
      { nombre: 'al abrir la página no se mira', de: '  // Al abrir la página: el teclado puede venir de la anterior (el login).\n  pedir(MS_DESPUES_DEL_TECLADO)\n', a: '' },
      { nombre: 'sin relojes se rompe', de: "  if (typeof win?.setTimeout !== 'function' || typeof doc?.addEventListener !== 'function') return null\n", a: '' },
      { nombre: 'un reloj viejo no se cancela', de: '    if (espera !== null) win.clearTimeout(espera)\n', a: '' },
      { nombre: 'la instalación no vigila', de: '    vigilarTeclado({ win, doc, barra: abajo })\n', a: '' },
      { nombre: 'la instalación vigila sin la barra', de: '    vigilarTeclado({ win, doc, barra: abajo })\n', a: '    vigilarTeclado({ win, doc })\n' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'css', 'main.css'), funciones: [], variable: 'ARCHIVO_CSS',
    manuales: [
      { nombre: 'la barra deja de ser fija', de: '    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 25;', a: '    display: flex; position: absolute; left: 0; right: 0; bottom: 0; z-index: 25;' },
      { nombre: 'la barra sin bottom', de: '    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 25;', a: '    display: flex; position: fixed; left: 0; right: 0; z-index: 25;' },
      { nombre: 'la barra con transform', de: '    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 25;', a: '    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 25; transform: translateZ(0);' },
      { nombre: 'el body con transform (rompe lo fijo)', de: '  min-height: 100dvh;\n}\n\nhtml, body {', a: '  min-height: 100dvh;\n  transform: translateZ(0);\n}\n\nhtml, body {' },
      { nombre: 'el body con will-change', de: '  min-height: 100dvh;\n}\n\nhtml, body {', a: '  min-height: 100dvh;\n  will-change: transform;\n}\n\nhtml, body {' },
      { nombre: 'html y body con filter', de: 'html, body {\n  overflow-x: hidden;', a: 'html, body {\n  filter: none;\n  overflow-x: hidden;' },
      { nombre: 'el body de alto fijo', de: '  min-height: 100dvh;\n}\n\nhtml, body {', a: '  min-height: 100dvh;\n  height: 100vh;\n}\n\nhtml, body {' },
    ],
  },
])
