// Mutaciones de test-cobranzas-numeros.js. Ver mutar.js (los tres guards:
// suite verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-cobranzas-numeros.js
//
// Sin automáticas: los escCob() los cubre mut-cobranzas-xss.js. Cada una de
// estas rompe, de a una, una lectura (vuelve a Number / parseFloat), una
// escritura (saca el ponerNumero) o el enlace de un campo. Todas tienen que
// dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const PF = (x) => `parseFloat(String(${x}).replace(',', '.'))`

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-numeros.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── Lecturas ─────────────────────────────────────────────────────────────
    { nombre: 'el importe que viaja se lee con parseFloat',
      de: '        importe: leerNumeroAr(ch.importe),', a: `        importe: ${PF('ch.importe')},` },
    { nombre: 'el importe que viaja se lee con Number',
      de: '        importe: leerNumeroAr(ch.importe),', a: '        importe: Number(ch.importe),' },
    { nombre: 'el efectivo que viaja se lee con Number',
      de: '      return leerNumeroAr(v) ?? 0', a: '      return Number(v) ?? 0' },
    { nombre: 'el efectivo que viaja se lee con parseFloat',
      de: '      return leerNumeroAr(v) ?? 0', a: `      return ${PF('v')} ?? 0` },
    { nombre: 'el total del formulario suma con parseFloat',
      de: '.reduce((acc, c) => acc + (leerNumeroAr(c.importe) ?? 0), 0)', a: `.reduce((acc, c) => acc + (${PF('c.importe')} || 0), 0)` },
    { nombre: '"el efectivo no se entiende" se decide con Number',
      de: "if (efectivoCrudo !== '' && leerNumeroAr(f.efectivo) === null) {", a: "if (efectivoCrudo !== '' && Number(f.efectivo) === null) {" },
    { nombre: '"el efectivo no se entiende" se decide con parseFloat',
      de: "if (efectivoCrudo !== '' && leerNumeroAr(f.efectivo) === null) {", a: `if (efectivoCrudo !== '' && isNaN(${PF('f.efectivo')})) {` },
    { nombre: 'la tarjeta lee el importe con parseFloat',
      de: '      const importeNum = leerNumeroAr(ch.importe)', a: `      const importeNum = ${PF('ch.importe')}` },
    { nombre: 'origen_datos compara con Number(texto)',
      de: 'Number(p.importe ?? NaN) === Number(leerNumeroAr(ch.importe) ?? NaN)', a: 'Number(p.importe ?? NaN) === Number(ch.importe)' },
    // ── Escrituras ───────────────────────────────────────────────────────────
    { nombre: 'escribirImporteEnCampo escribe el texto crudo en vez de ponerNumero',
      de: '      ponerNumero(input, n)\n    }', a: "      input.value = valor == null ? '' : String(valor)\n    }" },
    { nombre: 'el efectivo del borrador se escribe con .value',
      de: "      escribirImporteEnCampo(document.getElementById('cob-efectivo'), f.efectivo)",
      a: "      document.getElementById('cob-efectivo').value = f.efectivo" },
    { nombre: 'el importe del cheque no se escribe en el campo',
      de: '        escribirImporteEnCampo(inp, buscar(inp.dataset.importe)?.importe)\n', a: '' },
    { nombre: 'un borrador viejo ilegible se vacía en silencio',
      de: '        input.value = String(valor)\n        return\n', a: '        ponerNumero(input, null)\n        return\n' },
    { nombre: 'el OCR vuelve a guardar el importe como texto',
      de: "ch.importe = typeof p.importe === 'number' && Number.isFinite(p.importe) ? p.importe : ''",
      a: "ch.importe = p.importe != null ? String(p.importe) : ''" },
    // ── Enlaces ──────────────────────────────────────────────────────────────
    { nombre: 'el efectivo no se enlaza',
      de: "      enlazarCampoNumero(document.getElementById('cob-efectivo'), { decimales: 2 })\n", a: '' },
    { nombre: 'el importe del cheque no se enlaza',
      de: '        enlazarCampoNumero(inp, { decimales: 2 })\n', a: '' },
    { nombre: 'el importe del cheque se enlaza sin decimales',
      de: '        enlazarCampoNumero(inp, { decimales: 2 })\n', a: '        enlazarCampoNumero(inp, { decimales: 0 })\n' },
    { nombre: 'el importe del cheque se enlaza DESPUÉS de su listener (el estado guarda el crudo)',
      de: "      document.querySelectorAll('[data-importe]').forEach(inp => {\n        enlazarCampoNumero(inp, { decimales: 2 })\n        escribirImporteEnCampo(inp, buscar(inp.dataset.importe)?.importe)\n      })\n      conectarTexto('importe', 'importe')\n",
      a: "      conectarTexto('importe', 'importe')\n      document.querySelectorAll('[data-importe]').forEach(inp => {\n        enlazarCampoNumero(inp, { decimales: 2 })\n        escribirImporteEnCampo(inp, buscar(inp.dataset.importe)?.importe)\n      })\n" },
    { nombre: 'el efectivo se enlaza DESPUÉS de su listener (el estado guarda el crudo)',
      de: "      enlazarCampoNumero(document.getElementById('cob-efectivo'), { decimales: 2 })\n      campos.forEach(([id, prop]) => {\n        const el = document.getElementById(id)\n        el.addEventListener('input', () => {\n          if (!estado.form) return\n          estado.form[prop] = el.value\n          guardarBorrador()\n          pintarTotalYGuardado()\n        })\n      })\n",
      a: "      campos.forEach(([id, prop]) => {\n        const el = document.getElementById(id)\n        el.addEventListener('input', () => {\n          if (!estado.form) return\n          estado.form[prop] = el.value\n          guardarBorrador()\n          pintarTotalYGuardado()\n        })\n      })\n      enlazarCampoNumero(document.getElementById('cob-efectivo'), { decimales: 2 })\n" },
    { nombre: 'la plantilla vuelve a poner el importe en value=""',
      de: 'data-importe="${escCob(ch.id)}" placeholder="0,00">', a: 'data-importe="${escCob(ch.id)}" value="${escCob(ch.importe)}" placeholder="0,00">' },
    // ── Mostrar ──────────────────────────────────────────────────────────────
    { nombre: 'formatearImporte vuelve a Number(): null da "$ 0,00"',
      de: "      const texto = formatearNumeroAr(n, { decimales: 2 })\n      if (texto === '—') return '—'",
      a: "      const v = Number(n)\n      if (!Number.isFinite(v)) return '—'\n      const texto = formatearNumeroAr(v, { decimales: 2 })" },
    { nombre: 'formatearImporte pierde el espacio que no corta',
      de: "'-$\\u00a0' + texto.slice(1) : '$\\u00a0' + texto", a: "'-$ ' + texto.slice(1) : '$ ' + texto" },
  ],
})
