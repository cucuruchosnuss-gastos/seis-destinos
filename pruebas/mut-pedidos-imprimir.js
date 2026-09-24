// Mutaciones de test-pedidos-imprimir.js (Parte 5 de Pedidos). Ver mutar.js.
//
//   node pruebas/mut-pedidos-imprimir.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html y
// dan "ESCAPÓ" falsos.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pedidos-imprimir.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/pedidos.html'),
  escape: 'esc',
  funciones: ['htmlImpresion'],
  equivalentes: [
    { expr: 'esc(textoCajas(it.cajas))', motivo: 'textoCajas(): dígitos, puntos, comas o una raya' },
    { expr: 'esc(textoCajas(total))', motivo: 'textoCajas(): dígitos, puntos, comas o una raya' },
    { expr: 'esc(hechas)', motivo: 'textoCajas() entre texto constante del código' },
    { expr: 'esc(fechaCorta(p.fecha))', motivo: 'fechaCorta(): DD/MM/AAAA o una raya' },
    { expr: "esc(p.fecha_entrega ? fechaCorta(p.fecha_entrega) : 'sin fecha')", motivo: 'fechaCorta() o texto constante' },
  ],
  manuales: [
    { nombre: 'sin casillero', de: '<td class="pe-impresion__tilde"><span class="pe-casillero"></span></td>', a: '<td class="pe-impresion__tilde"></td>' },
    { nombre: 'sin las cajas', de: '          `<td class="pe-impresion__cajas">${esc(textoCajas(it.cajas))}</td>` +', a: '          `<td class="pe-impresion__cajas"></td>` +' },
    { nombre: 'sin la nota', de: "          `${it.observacion ? `<div class=\"pe-impresion__nota\">Nota: ${esc(it.observacion)}</div>` : ''}</td></tr>`", a: '          `</td></tr>`' },
    { nombre: 'el texto libre no avisa', de: "${texto ? '<span class=\"pe-impresion__falta\">FALTA IDENTIFICAR: </span>' : ''}", a: '' },
    { nombre: 'sin lo ya hecho', de: "        const hechas = Number(it.cajas_cumplidas) > 0 ? ` (ya hay ${textoCajas(it.cajas_cumplidas)})` : ''", a: "        const hechas = ''" },
    { nombre: 'el total suma lo cumplido', de: '      const total = (d.items ?? []).reduce((s, it) => s + (Number(it.cajas) || 0), 0)\n      return `<h1>', a: '      const total = (d.items ?? []).reduce((s, it) => s + (Number(it.cajas_cumplidas) || 0), 0)\n      return `<h1>' },
    { nombre: 'sin la entrega', de: ' · <strong>Entrega:</strong> ${esc(p.fecha_entrega ? fechaCorta(p.fecha_entrega) : \'sin fecha\')}', a: '' },
    { nombre: 'sin la localidad del cliente', de: "      const cliente = [c.nombre ?? 'Cliente (no se pudo leer)', c.localidad, c.telefono].filter(Boolean).join(' · ')", a: "      const cliente = c.nombre ?? 'Cliente (no se pudo leer)'" },
    { nombre: 'sin las observaciones', de: "        `${p.observaciones ? `<div><strong>Observaciones:</strong> ${esc(p.observaciones)}</div>` : ''}` +", a: '' },
    { nombre: 'un anulado no dice ANULADO', de: "        `${p.estado === 'anulado' ? '<div><strong>ANULADO</strong></div>' : ''}</div>` +", a: '        `</div>` +' },
    { nombre: 'no llama a print', de: '      document.getElementById(\'pe-impresion\').innerHTML = htmlImpresion(d, estado.catalogo)\n      window.print()', a: "      document.getElementById('pe-impresion').innerHTML = htmlImpresion(d, estado.catalogo)" },
    { nombre: 'imprime sin armar la hoja', de: "      document.getElementById('pe-impresion').innerHTML = htmlImpresion(d, estado.catalogo)\n", a: '' },
    { nombre: 'imprime sin pedido', de: '      if (!d?.pedido) return\n      document.getElementById(\'pe-impresion\')', a: "      document.getElementById('pe-impresion')" },
    { nombre: 'el botón no se ve', de: "      document.getElementById('pe-btn-imprimir').hidden = !p", a: "      document.getElementById('pe-btn-imprimir').hidden = true" },
    { nombre: 'la hoja se ve en pantalla', de: '    .pe-impresion { display: none; }', a: '    .pe-impresion { }' },
    { nombre: 'al imprimir se ve todo', de: '      body > *:not(#pe-impresion) { display: none !important; }', a: '' },
    { nombre: 'el casillero sin borde', de: '      .pe-casillero { display: inline-block; width: 16pt; height: 16pt; border: 2px solid #000; }', a: '      .pe-casillero { display: inline-block; width: 16pt; height: 16pt; }' },
  ],
})
