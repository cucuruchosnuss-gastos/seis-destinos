// Mutaciones de test-administracion-cobranzas-formas.js (Cobranzas por asentar
// con las cuatro formas de pago, 30/09/2026). Ver mutar.js: las automáticas
// sacan cada esc() de las funciones nuevas; las de a mano rompen una regla
// por vez.
//
//   node pruebas/mut-administracion-cobranzas-formas.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-cobranzas-formas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlTransferenciaCob', 'htmlTransferenciasCob'],
  equivalentes: [
    { expr: 'esc(error)', motivo: 'texto constante del código: lo pone leerTransferenciasDe()' },
  ],
  manuales: [
    // ── Las etiquetas ──────────────────────────────────────────────────────
    { nombre: 'el e-cheque se etiqueta como cheque de papel',
      de: "htmlFormaPago(ch.es_echeck ? 'echeck' : 'cheque')", a: "htmlFormaPago('cheque')" },
    { nombre: 'el e-cheque ofrece la foto',
      de: 'const foto = !ch.es_echeck && ch.foto_id ?', a: 'const foto = ch.foto_id ?' },
    { nombre: 'la transferencia pierde su ícono',
      de: '<span class="forma-pago forma-pago--transferencia"><svg', a: '<span class="forma-pago forma-pago--transferencia"><i' },
    { nombre: 'la fila de formas no marca el e-cheque',
      de: "if (lista.some(ch => ch.es_echeck)) formas.push('echeck')", a: '' },
    { nombre: 'la fila de formas no marca la transferencia',
      de: "if ((transf ?? []).length) formas.push('transferencia')", a: '' },
    { nombre: 'la fila de formas no marca el efectivo',
      de: "if (Number(c.efectivo) > 0) formas.push('efectivo')", a: '' },
    // ── Los datos de la tarjeta ────────────────────────────────────────────
    { nombre: 'los e-cheques se cuentan con los de papel',
      de: "datos.push(['Cheques', String(lista.length - echecks.length)])", a: "datos.push(['Cheques', String(lista.length)])" },
    { nombre: 'sin fila de transferencias',
      de: "if (transf.length) datos.push(['Transferencias',", a: "if (false) datos.push(['Transferencias'," },
    { nombre: 'un importe que no es número rompe la suma',
      de: "return Number.isFinite(n) ? acc + n : acc\n      }, 0)\n    }\n\n    // El nombre de cada banco",
      a: "return acc + n\n      }, 0)\n    }\n\n    // El nombre de cada banco" },
    { nombre: 'la transferencia no dice en qué cuenta entró',
      de: "const partes = [importeCob(t.importe), 'entró en ' + cuenta]", a: 'const partes = [importeCob(t.importe)]' },
    { nombre: 'la transferencia sin referencia',
      de: "if (limpio(t.referencia)) partes.push('Ref. ' + limpio(t.referencia))", a: '' },
    { nombre: 'un error de lectura se calla',
      de: 'if (error) return `<div class="ad-aviso">${esc(error)}</div>`', a: '' },
    // ── Dónde va la plata ──────────────────────────────────────────────────
    { nombre: 'el panel de asentar no dice dónde va la plata',
      de: "`${textoDondeVaLaPlata(c, cheques, transferencias) ? `<br>${esc(textoDondeVaLaPlata(c, cheques, transferencias))}` : ''}</div>`",
      a: "`</div>`" },
    { nombre: 'dónde va la plata: varias transferencias en singular',
      de: "(transf.length === 1 ? 'la transferencia se anota' : 'cada transferencia se anota')", a: "'la transferencia se anota'" },
    // ── La lectura ─────────────────────────────────────────────────────────
    { nombre: 'el select de cheques sin es_echeck',
      de: ".select('id, cobranza_id, foto_id, es_echeck, banco_codigo,", a: ".select('id, cobranza_id, foto_id, banco_codigo," },
    { nombre: 'la lista no lee las transferencias',
      de: 'const t = await leerTransferenciasDe(lista.map(f => f.cobranza_id))', a: 'const t = await leerTransferenciasDe([])' },
    { nombre: 'abierta: el total no suma las transferencias',
      de: ': Number(totalVista) + sumaImportesCob(transferencias)', a: ': Number(totalVista)' },
    { nombre: 'abierta: un total ausente pasa a ser la suma',
      de: "const total = totalVista === null || totalVista === undefined || totalVista === '' || !Number.isFinite(Number(totalVista))",
      a: "const total = false" },
    // ── Los links a Cobranzas ──────────────────────────────────────────────
    { nombre: 'el link para sumar e-cheques sin volver=',
      de: '&amp;volver=${encodeURIComponent(\'administracion.html?seccion=cobranzas\')}">Sumar', a: '">Sumar' },
    { nombre: 'sin link para cargar una cobranza',
      de: 'id="ad-cobranzas-cargar" href="cobranzas.html"', a: 'id="ad-cobranzas-cargar" href="#"' },
  ],
})
