// Mutaciones de test-administracion-nota-debito.js (la nota de débito en
// Administración: la hoja, la suelta y la cuenta del cliente, 24/10/2026).
// Ver mutar.js. Solo la parte de Administración (la cartera de cheques la
// mutan sus suites).
//
//   node pruebas/mut-administracion-nota-debito.js
//
// UN RUNNER POR VEZ.
'use strict'
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-nota-debito.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlNotaDebito', 'htmlRenglonesNota'],
  equivalentes: [
    { expr: "esc(ch.fecha_pago ? fechaNd(ch.fecha_pago) : 'A la vista')", motivo: 'una fecha dd/mm/aaaa (o "—") o un texto fijo: sin nada que escapar' },
    { expr: 'esc(fechaNd(ch.rechazo_fecha))', motivo: 'una fecha dd/mm/aaaa o "—": sin nada que escapar' },
    { expr: 'esc(importeHoja(ch.importe))', motivo: 'la plata: importeHoja() devuelve "$ n,nn" o "—", sin nada que escapar' },
    { expr: 'esc(importeHoja(it?.importe))', motivo: 'la plata: importeHoja() devuelve "$ n,nn" o "—", sin nada que escapar' },
    { expr: "esc('Fecha ' + fechaNd(d?.fecha))", motivo: 'una fecha dd/mm/aaaa o "—": sin nada que escapar' },
    { expr: 'esc(rotulo)', motivo: 'ORIGINAL o DUPLICADO: constante del código' },
    { expr: 'esc(importeHoja(d?.total))', motivo: 'la plata: importeHoja() devuelve "$ n,nn" o "—", sin nada que escapar' },
    { expr: "esc('Son ' + importeEnLetrasNd(d?.total))", motivo: 'letras mayúsculas armadas por el código: sin nada que escapar' },
    { expr: 'esc(r.toLowerCase())', motivo: 'original o duplicado: constante del código' },
    { expr: 'esc(r)', motivo: 'ORIGINAL o DUPLICADO: constante del código' },
  ],
  manuales: [
    // ── Las dos copias ────────────────────────────────────────────────────
    { nombre: 'una sola copia', de: "    const COPIAS_NOTA_DEBITO = ['ORIGINAL', 'DUPLICADO']", a: "    const COPIAS_NOTA_DEBITO = ['ORIGINAL']" },
    { nombre: 'el duplicado primero', de: "    const COPIAS_NOTA_DEBITO = ['ORIGINAL', 'DUPLICADO']", a: "    const COPIAS_NOTA_DEBITO = ['DUPLICADO', 'ORIGINAL']" },
    { nombre: 'las dos copias dicen ORIGINAL', de: '${copia(r)}</div>`).join(\'\')', a: '${copia(\'ORIGINAL\')}</div>`).join(\'\')' },
    { nombre: 'la copia sin su rótulo', de: "        `<div class=\"ndh-cab__copia\">${esc(rotulo)}</div></div></div>` +", a: "        '</div></div>' +" },
    { nombre: 'en la pantalla se ven las dos copias', de: '    #ad-nd-hoja .ndh-copia--duplicado { display: none; }\n', a: '' },
    { nombre: 'al imprimir el duplicado no salta de hoja', de: '    .ndh--papel .ndh-copia--duplicado { break-before: page; page-break-before: always; }\n', a: '' },
    { nombre: 'imprimir sin A4 vertical', de: "'<style>@media print { @page { size: A4 portrait; margin: 8mm; } }</style>' +\n        `<div class=\"ndh ndh--papel\">", a: "`<div class=\"ndh ndh--papel\">" },
    { nombre: 'imprimir no llama a window.print', de: '        `<div class="ndh ndh--papel">${htmlNotaDebito(d)}</div>`\n      window.print()', a: '        `<div class="ndh ndh--papel">${htmlNotaDebito(d)}</div>`' },
    // ── Lo que lleva la hoja ──────────────────────────────────────────────
    { nombre: 'la hoja sin el título', de: "'<div class=\"ndh-cab__titulo\"><div class=\"ndh-cab__titulo-texto\">NOTA DE DÉBITO</div>'", a: "'<div class=\"ndh-cab__titulo\"><div class=\"ndh-cab__titulo-texto\"></div>'" },
    { nombre: 'la hoja sin el total en letras', de: "        `<div class=\"ndh-letras\">${esc('Son ' + importeEnLetrasNd(d?.total))}</div>` +\n", a: '' },
    { nombre: 'la hoja sin la sección del cheque', de: '        destinatario + cheque +', a: '        destinatario +' },
    { nombre: 'la hoja sin los datos del cliente', de: '        destinatario + cheque +', a: '        cheque +' },
    { nombre: 'el sello ANULADA no se pone', de: "        (anulada ? '<div class=\"ndh-sello\" aria-hidden=\"true\">ANULADA</div>' : '') +\n", a: '' },
    { nombre: 'el motivo de la anulación no se escribe', de: " + (limpio(d?.anulada_motivo) ? ': ' + limpio(d.anulada_motivo) : '')", a: '' },
    { nombre: 'el logo sin el filtro', de: '      const logo = logoSeguro(e.logo_url)\n      const anulada', a: '      const logo = e.logo_url\n      const anulada' },
    { nombre: 'el CUIT sin guiones', de: "      return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : String(cuit ?? '').trim()\n    }\n\n    // Una fecha 'aaaa-mm-dd' (o con hora) como dd/mm/aaaa; sin fecha, \"—\".\n    function fechaNd", a: "      return String(cuit ?? '').trim()\n    }\n\n    // Una fecha 'aaaa-mm-dd' (o con hora) como dd/mm/aaaa; sin fecha, \"—\".\n    function fechaNd" },
    { nombre: 'letras: veintiún sin acortar', de: "        if (corto) t = t.replace(/veintiuno$/, 'veintiún').replace(/(^|\\s)uno$/, '$1un')\n        partes.push(t)\n      }\n      return partes.join(' ')\n    }\n    function letrasMenorDeMillonNd", a: "        partes.push(t)\n      }\n      return partes.join(' ')\n    }\n    function letrasMenorDeMillonNd" },
    { nombre: 'letras: "un millón" sin el "de"', de: "      const textoPesos = enteroEnLetrasNd(pesos) + (millonesJustos ? ' de' : '')", a: '      const textoPesos = enteroEnLetrasNd(pesos)' },
    { nombre: 'letras: sin los centavos', de: '      const pesos = Math.floor(c / 100), cent = c % 100\n      const millonesJustos = pesos >= 1e6 && pesos % 1e6 === 0\n      const textoPesos = enteroEnLetrasNd', a: '      const pesos = Math.floor(c / 100), cent = 0\n      const millonesJustos = pesos >= 1e6 && pesos % 1e6 === 0\n      const textoPesos = enteroEnLetrasNd' },
    // ── Abrir, anular ─────────────────────────────────────────────────────
    // 24/10/2026 (ajustes-24-10): abrir lee la hoja y la fábrica de la nota juntas.
    { nombre: 'abrir no lee datos_nota_debito', de: "[supabase.rpc('datos_nota_debito', { p_id: id }), leerUnidadNotaDebito(id)]", a: "[{ data: null, error: { message: 'sin leer' } }, leerUnidadNotaDebito(id)]" },
    { nombre: 'una anulada sigue ofreciendo Anular', de: "      if (!d || d.estado === 'anulada') return false\n", a: '      if (!d) return false\n' },
    { nombre: 'Anular para cualquiera', de: "      return tieneTarea('cobranzas', 'procesar') || puedeEn('retiros', 'precios', unidadId)\n", a: '      return true\n' },
    { nombre: 'anular sin motivo', de: "      if (motivo.length < LARGO_MINIMO_MOTIVO) { nd.errorAnular = 'Poné el motivo de la anulación.'; pintarNotaDebito(); return }\n", a: '' },
    { nombre: 'anular manda el motivo sin limpiar', de: "      const motivo = limpio(document.getElementById('ad-nd-motivo').value)", a: "      const motivo = document.getElementById('ad-nd-motivo').value" },
    { nombre: 'el error de anular se tapa', de: "nd.errorAnular = res.error.message || 'No se pudo anular la nota.'", a: "nd.errorAnular = 'No se pudo anular la nota.'" },
    { nombre: 'después de anular no se relee la hoja', de: '      if (estado.notaDebito === nd) abrirNotaDebito(nd.id)\n    }', a: '    }' },
    { nombre: 'después de anular no se avisa a la cartera', de: "      document.dispatchEvent(new CustomEvent('administracion:nota-debito-anulada', { detail: { id: nd.id } }))\n", a: '' },
    { nombre: 'el error de leer la hoja se tapa', de: "estado.notaDebito.error = 'No se pudo leer la nota de débito: ' + (res?.error?.message || 'no vino nada') + '.'", a: "estado.notaDebito.error = 'No se pudo leer la nota de débito.'" },
    { nombre: 'el error de leer la hoja sin escapar', de: "hoja.innerHTML = d ? htmlNotaDebito(d) : `<p class=\"ad-texto-suave\">${esc(nd.error || 'Cargando la nota de débito…')}</p>`", a: "hoja.innerHTML = d ? htmlNotaDebito(d) : `<p class=\"ad-texto-suave\">${nd.error || 'Cargando la nota de débito…'}</p>`" },
    // ── La cuenta del cliente ─────────────────────────────────────────────
    { nombre: 'la cuenta sin las etiquetas de la nota', de: "      nota_debito: 'Nota de débito', anulacion_nota_debito: 'Anulación de nota de débito',\n", a: '' },
    { nombre: 'la cuenta no lee las notas', de: '      return { cuenta, codigos, notas: await leerNotasDebitoCliente(clienteId, cuenta) }', a: '      return { cuenta, codigos, notas: new Map() }' },
    { nombre: 'la anulación no abre la hoja', de: "    const TIPOS_MOVIMIENTO_NOTA = ['nota_debito', 'anulacion_nota_debito']", a: "    const TIPOS_MOVIMIENTO_NOTA = ['nota_debito']" },
    { nombre: 'las notas de otro cliente', de: "      const r = await supabase.from('notas_debito').select('id, codigo, estado').eq('cliente_id', clienteId)", a: "      const r = await supabase.from('notas_debito').select('id, codigo, estado')" },
    { nombre: 'el renglón de la nota no es un botón', de: "          : nota ? `<button type=\"button\" class=\"ad-renglon ad-renglon--boton ad-renglon--nota\" data-cuenta-nota-debito=\"${esc(nota.id)}\">` : '<div class=\"ad-renglon\">'", a: " : '<div class=\"ad-renglon\">'" },
    { nombre: 'el id de la nota sin escapar en la cuenta', de: 'data-cuenta-nota-debito="${esc(nota.id)}"', a: 'data-cuenta-nota-debito="${nota.id}"' },
    { nombre: 'el código no se reconoce en el detalle', de: '    const RE_CODIGO_NOTA = /\\b([A-Z0-9?]+-ND-\\d+)\\b/', a: '    const RE_CODIGO_NOTA = /\\b(N-ND-0000)\\b/' },
    // ── La nota suelta ────────────────────────────────────────────────────
    { nombre: 'la suelta solo con retiros:precios', de: "      return puedeEn('retiros', 'precios', unidadId) || tieneTarea('cobranzas', 'procesar')", a: "      return puedeEn('retiros', 'precios', unidadId)" },
    { nombre: 'la suelta para cualquiera', de: "      return puedeEn('retiros', 'precios', unidadId) || tieneTarea('cobranzas', 'procesar')", a: '      return true' },
    { nombre: 'viajan los renglones sin importe', de: '      return (renglones ?? []).filter(g => Math.round(Number(g.importe) * 100) > 0)\n', a: '      return (renglones ?? [])\n' },
    { nombre: 'el concepto sin limpiar', de: '        .map(g => ({ concepto: limpio(g.concepto), importe:', a: '        .map(g => ({ concepto: g.concepto, importe:' },
    { nombre: 'la suelta sin renglones pasa', de: "      if (!itemsNota(n.renglones).length) return 'Escribí al menos un renglón con su importe.'\n", a: '' },
    { nombre: 'un renglón sin concepto pasa', de: "      if (itemsNota(n.renglones).some(g => !g.concepto)) return 'Cada renglón lleva su concepto.'\n", a: '' },
    { nombre: 'la fecha futura pasa', de: "      if (n.fecha > hoy) return 'La fecha no puede ser futura.'\n      if (!itemsNota", a: '      if (!itemsNota' },
    { nombre: 'las observaciones vacías viajan como ""', de: "p_observaciones: limpio(n.observaciones) || null }", a: 'p_observaciones: limpio(n.observaciones) }' },
    { nombre: 'un doble toque manda dos veces', de: "      if (!n || c.panel !== 'nota_debito' || estado.trabajando) return", a: "      if (!n || c.panel !== 'nota_debito') return" },
    { nombre: 'el error de la suelta se tapa', de: "c.errorPanel = res.error.message || 'No se pudo hacer la nota. Probá de nuevo.'", a: "c.errorPanel = 'No se pudo hacer la nota. Probá de nuevo.'" },
    { nombre: 'después de la suelta no se abre la hoja', de: '      if (d.nota_debito_id) abrirNotaDebito(d.nota_debito_id)\n', a: '' },
    // ── El evento de la cartera ───────────────────────────────────────────
    { nombre: 'la cartera no puede abrir la hoja', de: "      document.addEventListener('administracion:nota-debito', (e) => abrirNotaDebito(e.detail?.id))", a: '' },
  ],
})
