// Mutaciones de test-retiros-hoja-sin-cortes.js (23/10/2026, caso N-0025):
// mutan js/retiros-comun.js, que la suite recibe por ARCHIVO_COMUN_RETIROS.
// Ver mutar.js.
//
//   node pruebas/mut-retiros-hoja-sin-cortes.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-hoja-sin-cortes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'retiros-comun.js'),
  variable: 'ARCHIVO_COMUN_RETIROS',
  funciones: [],
  manuales: [
    // planHoja: lo que entra en una hoja va en UNA
    { nombre: 'la copia que entra en una hoja se parte igual', de: '  if (copia <= entera) return una\n', a: '' },
    { nombre: 'las medidas absurdas se usan igual', de: "  if (medidasRaras(medidas, { entera })) return copia > 0 ? una : { modo: 'media' }\n", a: '' },
    { nombre: 'con medidas absurdas siempre media hoja', de: "return copia > 0 ? una : { modo: 'media' }", a: "return { modo: 'media' }" },
    { nombre: 'con medidas absurdas y sin poder medir: hoja entera', de: "return copia > 0 ? una : { modo: 'media' }", a: 'return una' },
    // medidasRaras
    { nombre: 'medir sin estilos no es raro', de: "  if (medidas.estilos === false) return 'la hoja se midió sin sus estilos'\n", a: '' },
    { nombre: 'una parte más alta que la hoja no es rara', de: '    if (v > entera) return `${k} mide más que una hoja entera`', a: '    if (false) return `${k} mide más que una hoja entera`' },
    { nombre: 'cabecera y final juntos no se miran', de: "  if (Number(medidas.fijo) + Number(medidas.final) > entera) return 'la cabecera y el final no entran juntos en una hoja'\n", a: '' },
    { nombre: 'una parte negativa no es rara', de: '    if (!Number.isFinite(v) || v < 0) return', a: '    if (!Number.isFinite(v)) return' },
    { nombre: 'una copia de 0 mm no es rara', de: "  if (!Number.isFinite(copia) || copia <= 0) return 'la copia entera no se pudo medir'\n", a: '' },
    { nombre: 'un renglón que no es número no es raro', de: "  if (filas.some(f => !Number.isFinite(Number(f)) || Number(f) < 0)) return 'un renglón no es una medida'\n", a: '' },
    // El registro de errores
    { nombre: 'las medidas del registro con decimales', de: '  const r = (x) => Number.isFinite(Number(x)) ? Math.round(Number(x)) : String(x)', a: '  const r = (x) => Number.isFinite(Number(x)) ? Number(x) : String(x)' },
    { nombre: 'los renglones del registro con comas', de: '.map(r).join(\' \'), plan: planHoja(medidas),', a: '.map(r), plan: planHoja(medidas),' },
    { nombre: 'lo raro no se registra', de: '    if (rara) registrarMedidaRara(orden, medidas, rara, conPrecios)', a: '    if (false) registrarMedidaRara(orden, medidas, rara, conPrecios)' },
    { nombre: 'el registro con otro evento', de: "registrarError({ evento: 'hoja',", a: "registrarError({ evento: 'error'," },
    { nombre: 'el registro sin decir si tenía precios', de: 'conPrecios: conPrecios === true, motivo,', a: 'conPrecios: false, motivo,' },
    // medirHoja: el texto primero, después la letra y los estilos
    { nombre: 'la letra se espera ANTES de poner el texto', de: '    caja.innerHTML = htmlHoja(orden, { conPrecios, copias: una })\n    const estilos = await esperarHojaLista(caja, doc)', a: '    const estilos = await esperarHojaLista(caja, doc)\n    caja.innerHTML = htmlHoja(orden, { conPrecios, copias: una })' },
    { nombre: 'no espera a que lleguen los estilos', de: '  while (!hojaConEstilos(caja, doc) && Date.now() < hasta) await dormir(50)\n', a: '' },
    { nombre: 'no pide la letra', de: '    await Promise.race([Promise.all(pesos.map(p => doc.fonts.load(`${p} 14px Archivo`))), resto()])\n', a: '' },
    { nombre: 'no dice si se midió sin estilos', de: '    const medidas = { copiaEntera: alto(copia), fijo, final, intermedio, filas, estilos }', a: '    const medidas = { copiaEntera: alto(copia), fijo, final, intermedio, filas }' },
    { nombre: 'la caja de medir queda puesta', de: '  } finally {\n    caja.remove()\n  }', a: '  } finally {\n  }' },
    // La letra en su <link>
    { nombre: 'la letra vuelve al @import', de: 'export const ESTILOS_HOJA = `\n', a: "export const ESTILOS_HOJA = `\n@import url('${FUENTE_HOJA}');\n" },
    { nombre: 'sin el <link> de la letra', de: '  doc.head.appendChild(f)\n', a: '' },
    { nombre: 'el <link> de la letra antes que los estilos (Safari los frena)',
      de: "  s.textContent = ESTILOS_HOJA\n  doc.head.appendChild(s)\n",
      a: "  s.textContent = ESTILOS_HOJA\n  const f0 = doc.createElement('link')\n  f0.rel = 'stylesheet'\n  f0.href = FUENTE_HOJA\n  doc.head.appendChild(f0)\n  doc.head.appendChild(s)\n" },
    // La media hoja más justa
    { nombre: 'los renglones vuelven a 16 px', de: '.rh-tabla td { font-size: 14px;', a: '.rh-tabla td { font-size: 16px;' },
    { nombre: 'las cajas vuelven a 22 px', de: '.rh-cajas { font-size: 18px !important;', a: '.rh-cajas { font-size: 22px !important;' },
    { nombre: 'las cajas de insumo a 16 px', de: '.rh-insumo .rh-cajas { font-size: 14px !important;', a: '.rh-insumo .rh-cajas { font-size: 16px !important;' },
    { nombre: 'las cajas con interlineado de antes', de: 'font-weight: 800; line-height: 1 !important; white-space: nowrap; }', a: 'font-weight: 800; line-height: 1.1; white-space: nowrap; }' },
    { nombre: 'los espacios entre bloques de 8 px', de: 'flex-direction: column; gap: 3px; break-inside', a: 'flex-direction: column; gap: 8px; break-inside' },
    { nombre: 'la cabecera de 70 px', de: 'export const ALTO_LOGO_HOJA_PX = 56', a: 'export const ALTO_LOGO_HOJA_PX = 70' },
  ],
})
