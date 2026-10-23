// LA HOJA SIN CORTES DE MÁS (23/10/2026, caso N-0025 de SALVADOR LOFORTE: 5
// renglones y observaciones no entraron en media hoja y, en hoja entera,
// salieron en "HOJA 1 DE 2" con 4 renglones y "HOJA 2 DE 2" con 1).
//
// La causa: en Safari la hoja se medía ANTES de tener sus estilos (el @import
// de la letra adentro de los estilos los dejaba en suspenso hasta que Google
// Fonts contestaba), así que el logo medía ~160 mm y planHoja recibía una
// cabecera absurda. Esta suite prueba:
//  - planHoja: si la copia entera entra en una hoja, va en UNA; con "final"
//    inflado nunca parte una orden de 5 renglones; con medidas absurdas usa
//    media hoja si la copia entra, o una hoja entera si no;
//  - medidasRaras / textoMedidaRara: qué es absurdo y qué va al registro;
//  - medirHoja: pide la letra con el texto ya puesto, espera los estilos y,
//    si nunca llegan, lo dice (estilos: false) y lo registra;
//  - la letra en su propio <link>, y la media hoja más justa (14 / 18 px).
//
//   node pruebas/test-retiros-hoja-sin-cortes.js
// Overrides: ARCHIVO_TEST (retiros.html), ARCHIVO_ADMIN (administracion.html),
// ARCHIVO_COMUN_RETIROS (el común, para mutarlo).

process.env.TZ = 'UTC'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { construirAdministracion } = require('./sandbox-administracion')
const { RUTA_COMUN_RETIROS } = require('./fuente-cobranzas')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const ARCHIVO_ADMIN = process.env.ARCHIVO_ADMIN || path.join(__dirname, '..', 'modulos/administracion.html')
const comun = fs.readFileSync(RUTA_COMUN_RETIROS, 'utf8')
console.log(`ARCHIVO ${RUTA_COMUN_RETIROS} (${comun.length} bytes)`)
const { chk, esperas, fin } = arnes()
// El registro de errores se espía: js/salud.js es un import (el sandbox lo saca).
globalThis.__registrosHoja = []
const PRELUDIO_REGISTRO = 'function registrarError(x) { globalThis.__registrosHoja.push(x) }'
const registrosDe = (codigo) => globalThis.__registrosHoja.filter(r => JSON.parse(r.detalle).orden === codigo)
const nuevo = () => construirRetiros(ARCHIVO, { preludioExtra: PRELUDIO_REGISTRO, constantes: [] })
const S = nuevo()
const ENTERA = S.ALTO_UTIL_A4_MM
const MEDIA = S.ALTO_MEDIA_HOJA_MM

// Lo que midió el chat de la base en Chromium con Archivo (la N-0025, antes
// de achicar la media hoja).
const N0025 = { copiaEntera: 129.2, fijo: 45.7, final: 33.3, intermedio: 16, filas: [12.4, 8.3, 12.4, 8.3, 8.3] }
const paginas = (p) => p.modo === 'media' ? 1 : p.paginas.length
const unaSola = (p, n) => p.modo === 'entera' && p.paginas.length === 1 && p.paginas[0][0] === 0 && p.paginas[0][1] === n

// ── planHoja con la N-0025 ──────────────────────────────────────────────────
{
  chk('la N-0025 tal como la midió Chromium: media hoja', S.planHoja(N0025).modo === 'media')
  for (const final of [150, 186, 190, 250]) {
    chk(`con "final" inflado a ${final} mm y la copia de 129 mm: media hoja (nunca se parte)`, S.planHoja({ ...N0025, final }).modo === 'media')
  }
  for (const copiaEntera of [140, 200, 242.5, 280, ENTERA]) {
    for (const final of [33.3, 190, 230]) {
      const p = S.planHoja({ ...N0025, copiaEntera, final })
      chk(`copia de ${copiaEntera} mm y final de ${final}: UNA hoja por copia (sin "Sigue en la hoja")`, unaSola(p, 5))
    }
  }
  // Lo que pasó en el equipo de Facu (Safari, la hoja sin estilos): la
  // cabecera de 198 mm. Con el plan de antes salía 4 + 1.
  const safari = { copiaEntera: 250, fijo: 197.7, final: 40, intermedio: 16.8, filas: [12.4, 8.3, 12.4, 8.3, 8.3] }
  chk('la medida de Safari sin estilos: UNA hoja por copia, no 4 + 1', unaSola(S.planHoja(safari), 5))
  chk('… y con estilos: false (se midió sin estilos), media hoja si la copia entra', S.planHoja({ ...safari, copiaEntera: 120, estilos: false }).modo === 'media')
  chk('… o UNA hoja entera si no entra', unaSola(S.planHoja({ ...safari, copiaEntera: 300, estilos: false }), 5))
}

// ── Nunca una hoja con un solo renglón cuando el total entraba en una ───────
{
  // Al azar: cualquier orden de 1 a 12 renglones cuya copia entera entra en una
  // hoja sale en UNA (o en media hoja), con cualquier "final".
  let semilla = 7
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647
  let malos = 0
  for (let i = 0; i < 400; i++) {
    const n = 1 + Math.floor(azar() * 12)
    const filas = Array.from({ length: n }, () => 6 + azar() * 10)
    const m = { copiaEntera: 20 + azar() * (ENTERA - 20), fijo: azar() * 120, final: azar() * 300, intermedio: azar() * 30, filas }
    if (paginas(S.planHoja(m)) !== 1) malos++
  }
  chk('400 órdenes al azar que entran en una hoja: ninguna se parte', malos === 0)
  // Si las partes dicen que entra (cabecera + renglones + final ≤ hoja), una
  // sola, aunque la copia entera haya medido de más.
  chk('las partes entran: UNA hoja aunque la copia mida 300', unaSola(S.planHoja({ ...N0025, copiaEntera: 300 }), 5))
  // Lo que de verdad no entra se sigue partiendo como antes.
  const grande = S.planHoja({ copiaEntera: 300, fijo: 40, final: 50, intermedio: 15, filas: Array(25).fill(9) })
  chk('25 renglones de 9 mm (300 mm): se parte en 2', grande.modo === 'entera' && grande.paginas.length === 2)
  chk('… y la última hoja tiene renglones', grande.paginas[1][1] - grande.paginas[1][0] >= 1)
}

// ── medidasRaras: lo que no puede ser ──────────────────────────────────────
{
  chk('la N-0025 no es rara', S.medidasRaras(N0025) === null)
  chk('sin medidas: rara', /no hay medidas/.test(S.medidasRaras(null)))
  chk('medida sin estilos: rara', /sin sus estilos/.test(S.medidasRaras({ ...N0025, estilos: false })))
  chk('una copia de 0 mm (escondida): rara', /no se pudo medir/.test(S.medidasRaras({ ...N0025, copiaEntera: 0 })))
  chk('una copia que no es número: rara', /no se pudo medir/.test(S.medidasRaras({ ...N0025, copiaEntera: NaN })))
  chk('un final más alto que la hoja entera: raro', /final mide más que una hoja entera/.test(S.medidasRaras({ ...N0025, final: ENTERA + 1 })))
  chk('una cabecera más alta que la hoja entera: rara', /fijo mide más/.test(S.medidasRaras({ ...N0025, fijo: 300 })))
  chk('lo de una hoja que sigue más alto que la hoja: raro', /intermedio mide más/.test(S.medidasRaras({ ...N0025, intermedio: 290 })))
  chk('cabecera y final que no entran juntos: raro', /no entran juntos/.test(S.medidasRaras({ ...N0025, fijo: 200, final: 100 })))
  chk('una parte negativa: rara', /no es una medida/.test(S.medidasRaras({ ...N0025, final: -3 })))
  chk('un renglón que no es número: raro', /renglón/.test(S.medidasRaras({ ...N0025, filas: [10, 'x'] })))
  chk('justo la hoja entera NO es raro', S.medidasRaras({ ...N0025, final: ENTERA - 45.7 }) === null)
  chk('un RENGLÓN más alto que una hoja no es raro (va solo en su hoja)', S.medidasRaras({ ...N0025, filas: [300, 5] }) === null)
  // Lo absurdo: media hoja si la copia entra, si no UNA hoja entera.
  chk('final absurdo y la copia entra en media: media hoja', S.planHoja({ ...N0025, final: 400 }).modo === 'media')
  chk('final absurdo y la copia no entra en media: UNA hoja entera', unaSola(S.planHoja({ ...N0025, copiaEntera: 150, final: 400 }), 5))
  chk('final absurdo y la copia mide más que la hoja: igual UNA (no se confía en las partes)', unaSola(S.planHoja({ ...N0025, copiaEntera: 320, final: 400 }), 5))
  chk('sin poder medir la copia: media hoja', S.planHoja({ ...N0025, copiaEntera: NaN }).modo === 'media' && S.planHoja(undefined).modo === 'media')
}

// ── Lo que va al registro de errores ───────────────────────────────────────
{
  const t = S.textoMedidaRara({ codigo: 'N-0025' }, { ...N0025, final: 400.4 }, 'final mide más que una hoja entera', true)
  const j = JSON.parse(t)
  chk('el registro dice la orden, el motivo y si tenía precios', j.orden === 'N-0025' && /final mide más/.test(j.motivo) && j.conPrecios === true)
  chk('las medidas en mm ENTEROS (el registro tapa los números de 4 cifras)', j.copiaEntera === 129 && j.final === 400 && j.fijo === 46 && j.filas === '12 8 12 8 8')
  // Lo mismo que tapa limpiarTexto() de js/salud.js: un número de 4 cifras o más.
  const tapados = [...t.replace('N-0025', '').matchAll(/\d[\d.,]{2,}\d/g)].filter(m => m[0].replace(/\D/g, '').length >= 4)
  chk('ningún número que el registro tape', tapados.length === 0)
  chk('y el plan que salió', j.plan && j.plan.modo === 'media')
  chk('el registro usa registrarError de js/salud.js, con evento "hoja"', /^import \{ registrarError \} from '\.\/salud\.js'$/m.test(comun) &&
    /registrarError\(\{ evento: 'hoja', mensaje: `Hoja de la orden: medida rara \(\$\{motivo\}\)`, detalle: textoMedidaRara\(/.test(comun))
  chk('medirHoja registra solo si hay algo raro', /const rara = medidasRaras\(medidas\)\n\s+if \(rara\) registrarMedidaRara\(orden, medidas, rara, conPrecios\)/.test(comun))
  chk('el registro nunca rompe la hoja (try/catch)', /function registrarMedidaRara[\s\S]{0,400}catch \{/.test(comun))
}

// ── medirHoja con un navegador falso ───────────────────────────────────────
// Una caja que devuelve alturas fijas (en px) y unos estilos que llegan tarde.
const PX = 96 / 25.4
function navegadorFalso({ altos, estilosEn = 0, logoPx = S.ALTO_LOGO_HOJA_PX, fuentesListas = true }) {
  const log = { cargas: [], consultas: 0, removida: false }
  let puesto = false
  const el = (alto, extra = {}) => ({ style: {}, getBoundingClientRect: () => ({ height: alto * PX }), ...extra })
  const elementos = {
    '.rh-cab': el(altos.cab), '.rh-cliente': el(altos.cliente), 'thead': el(altos.thead), 'tfoot': el(altos.tfoot),
    '.rh-notas': el(altos.notas), '.rh-pie': el(altos.pie), '.rh-legal': el(altos.legal),
  }
  const buscar = (sel) => puesto ? (elementos[sel] ?? null) : null
  const tabla = { querySelector: buscar }
  const filas = altos.filas.map(a => el(a))
  const copia = el(altos.copia, { querySelector: (s) => s === '.rh-tabla' ? tabla : buscar(s), querySelectorAll: (s) => s === 'tbody tr' ? filas : [] })
  const logo = { getBoundingClientRect: () => ({ height: log.consultas >= estilosEn ? logoPx : 600 }) }
  const caja = {
    style: {},
    set innerHTML(v) { puesto = v.length > 0 }, get innerHTML() { return puesto ? '<x>' : '' },
    querySelector: (s) => !puesto ? null : s === '.rh-copia' ? copia : s === '.rh-logo' ? logo : null,
    querySelectorAll: () => [],
    remove() { log.removida = true },
  }
  const doc = {
    createElement: () => caja, body: { appendChild() {} }, head: { appendChild() {} },
    getElementById: (id) => id === 'rh-estilos' ? {} : null,
    // El reloj de verdad (el del sandbox de la Carga no corre nunca).
    defaultView: { setTimeout: (f, ms) => globalThis.setTimeout(f, ms), getComputedStyle: () => { log.consultas++; return { display: log.consultas > estilosEn ? 'flex' : 'block' } } },
    fonts: fuentesListas ? { load: async (f) => { log.cargas.push({ f, conTexto: puesto }) }, ready: Promise.resolve() } : undefined,
  }
  return { doc, log }
}
const ALTOS = { copia: 101.9, cab: 18, cliente: 13, thead: 5, tfoot: 7, notas: 4, pie: 7, legal: 4, filas: [9.8, 6.1, 9.8, 6.1, 6.1] }
// Corren UNA DESPUÉS DE OTRA y al final de la suite: medirHoja espera con un
// tope de 3 s de reloj, y armar el sandbox de Administración (sincrónico)
// tarda más que eso.
async function casosMedirHoja() {
  {
    const R = nuevo()
    const { doc, log } = navegadorFalso({ altos: ALTOS })
    const m = await R.medirHoja({ codigo: 'N-A' }, { doc })
    chk('medirHoja: con estilos, mide la copia entera', Math.abs(m.copiaEntera - 101.9) < 0.01 && m.estilos === true)
    chk('… los renglones uno por uno', m.filas.length === 5 && Math.abs(m.filas[0] - 9.8) < 0.01)
    chk('… la letra se pide CON el texto ya puesto (antes no esperaba nada)', log.cargas.length === 4 && log.cargas.every(c => c.conTexto) && log.cargas.some(c => /800 14px Archivo/.test(c.f)))
    chk('… la caja se saca al terminar', log.removida)
    chk('… y no registra nada', registrosDe('N-A').length === 0)
  }
  {
    const R = nuevo()
    const { doc, log } = navegadorFalso({ altos: ALTOS, estilosEn: 3 })
    const m = await R.medirHoja({ codigo: 'N-B' }, { doc })
    chk('medirHoja: si los estilos llegan tarde, los espera', m.estilos === true && log.consultas > 3)
    chk('… y no registra nada', registrosDe('N-B').length === 0)
  }
  {
    // Los estilos NUNCA llegan (la hoja de Safari sin estilos): la cabecera
    // mide 180 mm. Lo dice (estilos: false), el plan no la parte, y se registra.
    const sinEstilos = { ...ALTOS, copia: 250, cab: 180 }
    const R = nuevo()
    const { doc } = navegadorFalso({ altos: sinEstilos, estilosEn: 1e9 })
    const t0 = Date.now()
    const m = await R.medirHoja({ codigo: 'N-C' }, { doc, conPrecios: true })
    const tardo = Date.now() - t0
    chk(`medirHoja: sin estilos lo dice (estilos: false), con tope de espera (${tardo} ms)`, m.estilos === false && tardo >= 2900 && tardo < 6000)
    chk('… el plan no parte la orden: UNA hoja por copia', unaSola(R.planHoja(m), 5))
    const r = registrosDe('N-C')
    chk('… y queda en el registro de errores, con las medidas', r.length === 1 && r[0].evento === 'hoja' && /medida rara \(la hoja se midió sin sus estilos\)/.test(r[0].mensaje) &&
      JSON.parse(r[0].detalle).copiaEntera === 250 && JSON.parse(r[0].detalle).conPrecios === true && JSON.parse(r[0].detalle).estilos === false)
  }
}

// ── La letra en su <link> y la media hoja más justa ─────────────────────────
{
  const css = S.ESTILOS_HOJA
  chk('los estilos de la hoja NO tienen @import (Safari los dejaba en suspenso)', !/@import/.test(css))
  chk('la letra va en un <link id="rh-fuente"> aparte', /f\.id = 'rh-fuente'\s+f\.rel = 'stylesheet'\s+f\.href = FUENTE_HOJA\s+doc\.head\.appendChild\(f\)/.test(comun))
  // En Safari una hoja que todavía baja frena a las que se agregan después.
  chk('los estilos de la hoja se agregan ANTES que el <link> de la letra', /s\.textContent = ESTILOS_HOJA\s+doc\.head\.appendChild\(s\)[\s\S]{0,400}f\.href = FUENTE_HOJA\s+doc\.head\.appendChild\(f\)\n\}/.test(comun))
  chk('medirHoja pone el texto ANTES de esperar la letra y los estilos', /caja\.innerHTML = htmlHoja\(orden, \{ conPrecios, copias: una \}\)\n\s+const estilos = await esperarHojaLista\(caja, doc\)/.test(comun))
  chk('… y espera la hoja de la letra (load / error) con tope', /fuente\.addEventListener\('load', r, \{ once: true \}\); fuente\.addEventListener\('error', r, \{ once: true \}\)/.test(comun))
  chk('los renglones en 14 px y las cajas en 18 px', /\.rh-tabla td \{ font-size: 14px;/.test(css) && /\.rh-cajas \{ font-size: 18px !important;/.test(css) && /\.rh-insumo \.rh-cajas \{ font-size: 14px !important;/.test(css))
  chk('el renglón justo: cajas con interlineado 1', /\.rh-cajas \{[^}]*line-height: 1 !important/.test(css))
  chk('la cabecera y el logo de 56 px', S.ALTO_LOGO_HOJA_PX === 56 && /\.rh-cab \{[^}]*min-height: 56px/.test(css) && /\.rh-logo \{ width: 56px; height: 56px;/.test(css))
  chk('los espacios entre bloques de 3 px', /\.rh-copia \{[^}]*gap: 3px/.test(css))
  chk('la media hoja sigue de 136 mm y la hoja entera de 281', MEDIA === 136 && ENTERA === 281 && /\.rh-hoja--media \.rh-copia \{ height: 136mm/.test(css))
  chk('sigue en blanco y negro', (css.match(/#[0-9a-f]{3,6}\b/gi) || []).every(c => /^#(000|000000|fff|ffffff)$/i.test(c)))
}

// ── Administración usa el MISMO plan ───────────────────────────────────────
{
  const A = construirAdministracion(ARCHIVO_ADMIN)
  chk('Administración: la N-0025 con final inflado no se parte', A.planHoja({ ...N0025, final: 190 }).modo === 'media')
  chk('Administración: una copia de 141 mm (con precios) va en UNA hoja entera', unaSola(A.planHoja({ ...N0025, copiaEntera: 141.6, fijo: 49.7, filas: [12.4, 8.3, 12.4, 12.4, 12.4] }), 5))
}

esperas.push(casosMedirHoja())
Promise.all(esperas).then(() => fin())
