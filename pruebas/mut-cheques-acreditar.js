// Mutaciones de test-cheques-acreditar.js (acreditar venta y depósito: el
// gasto del banco se crea solo al acreditar, 28/10/2026). Ver mutar.js. Muta
// SOLO la región de Cheques de administracion.html, de a una.
//
//   node pruebas/mut-cheques-acreditar.js
//   MUT_SOLO_ANCLAS=1 node pruebas/mut-cheques-acreditar.js   (solo las anclas)

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const SUITE = path.join(__dirname, 'test-cheques-acreditar.js')

correrMutacionesEnVarios([
  {
    region: limitesCheques,
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
    escape: 'esc',
    funciones: ['htmlBloquesEnBanco', 'htmlFilaAcreditar', 'htmlResultadoAcreditar', 'pintarResumenAcreditar'],
    equivalentes: [
      { expr: 'esc(total)', motivo: 'una cantidad y un importe formateado ("2 cheques · $ 1.250.000,50"): sin ningún carácter que escapar' },
      { expr: "esc(venta ? 'Monto acreditado' : 'Gastos del banco')", motivo: 'texto fijo del código' },
      { expr: 'esc(modoEnBanco(ch))', motivo: "solo puede ser 'venta' o 'deposito' (modoEnBanco no devuelve otra cosa)" },
      { expr: 'esc(formatearImporte(ch.importe))', motivo: 'un importe formateado (o "—"): sin ningún carácter que escapar' },
      { expr: 'esc(textoModoEnvio(ch.salida_modo))', motivo: 'texto fijo del código: "Venta" o "Depósito"' },
      { expr: "esc(vivo.error ? 'chq-acr-fila__vivo chq-acr-fila__vivo--error' : 'chq-acr-fila__vivo')", motivo: 'una de dos clases fijas del código' },
      { expr: 'esc(formatearImporte(c / 100))', motivo: 'un importe formateado: sin ningún carácter que escapar' },
      { expr: 'esc(formatearImporte(o.centavos / 100))', motivo: 'un importe formateado: sin ningún carácter que escapar' },
      { expr: 'esc(clase)', motivo: 'la clase de la fila del resumen: literales del código (vacía o chq-venta-resumen__total)' },
      { expr: 'esc(k)', motivo: 'el rótulo de la fila del resumen: literales del código con un número ("Total de los 3 cheques", "Gasto del banco", "Queda en la cuenta")' },
      { expr: 'esc(v)', motivo: 'el valor de la fila del resumen: siempre un importe formateado (formatearImporte)' },
      { expr: 'esc(corregir)', motivo: 'texto fijo con un número ("Hay 2 montos para corregir.")' },
    ],
    manuales: [
      // «En el banco»: los dos bloques
      { nombre: 'los bloques al revés (depositados arriba)', de: "      { modo: 'venta', titulo: 'Vendidos · esperando acreditación' },\n      { modo: 'deposito', titulo: 'Depositados · esperando acreditación' },\n", a: "      { modo: 'deposito', titulo: 'Depositados · esperando acreditación' },\n      { modo: 'venta', titulo: 'Vendidos · esperando acreditación' },\n" },
      { nombre: 'el título de los vendidos sin "esperando acreditación"', de: "titulo: 'Vendidos · esperando acreditación'", a: "titulo: 'Vendidos'" },
      { nombre: 'el total del bloque en cero', de: 'return { ...b, cheques, centavos: centavosDe(cheques), grupos:', a: 'return { ...b, cheques, centavos: 0, grupos:' },
      { nombre: 'también los bloques vacíos', de: '      }).filter(b => b.cheques.length)\n', a: '      })\n' },
      { nombre: 'el total del bloque dice siempre "cheques"', de: "const total = (n === 1 ? '1 cheque · ' : n + ' cheques · ')", a: "const total = (n + ' cheques · ')" },
      { nombre: 'la clave del grupo sin el modo (venta y depósito del mismo día juntos)', de: 'const clave = `${modoEnBanco(ch)}|${ch.salida_cuenta_id', a: 'const clave = `${ch.salida_cuenta_id' },
      { nombre: 'un modo raro se acredita como venta', de: "      return ch?.salida_modo === 'venta' ? 'venta' : 'deposito'\n", a: "      return ch?.salida_modo === 'deposito' ? 'deposito' : 'venta'\n" },
      { nombre: 'la vista pinta los grupos sin los bloques', de: 'else lista.innerHTML = htmlBloquesEnBanco(bloquesEnBanco(filas, estado.cuentasBanco?.porId),', a: 'else lista.innerHTML = htmlGruposEnBanco(gruposEnBanco(filas, estado.cuentasBanco?.porId),' },
      // Lo que viene en el campo
      { nombre: 'el depósito viene vacío en vez de 0', de: "      if (!esVentaEnBanco(ch)) return '0'\n", a: "      if (!esVentaEnBanco(ch)) return ''\n" },
      { nombre: 'la venta viene con dos decimales siempre', de: 'minimos: Number.isInteger(imp) ? 0 : 2 })', a: 'minimos: 2 })' },
      // Las validaciones
      { nombre: 'sin la regla de los negativos', de: "      if (t.startsWith('-')) {\n", a: '      if (false) {\n' },
      { nombre: 'la venta vacía pasa', de: "      if (venta && t === '') {\n", a: '      if (false) {\n' },
      { nombre: 'la venta acepta cero', de: '        if (c <= 0) r.error =', a: '        if (c < 0) r.error =' },
      { nombre: 'la venta no acepta lo acreditado igual al importe', de: '        else if (c > importeCent) r.error =', a: '        else if (c >= importeCent) r.error =' },
      { nombre: 'la venta acepta más que el importe', de: '        else if (c > importeCent) r.error =', a: '        else if (false) r.error =' },
      { nombre: 'el depósito acepta gastos iguales al importe', de: '      if (c >= importeCent) r.error =', a: '      if (c > importeCent) r.error =' },
      { nombre: 'un texto inválido pasa como cero', de: '      if (n === null) {\n', a: '      if (false) {\n' },
      { nombre: 'el parser lee con tres decimales', de: "const n = t === '' ? 0 : leerNumeroAr(t, { decimales: 2 })", a: "const n = t === '' ? 0 : leerNumeroAr(t, { decimales: 3 })" },
      { nombre: 'el gasto de la venta es lo acreditado (al revés)', de: 'else { r.acreditadoCent = c; r.gastoCent = importeCent - c }', a: 'else { r.acreditadoCent = c; r.gastoCent = c }' },
      { nombre: 'el depósito acredita el importe menos los gastos', de: 'else { r.acreditadoCent = importeCent; r.gastoCent = c }', a: 'else { r.acreditadoCent = importeCent - c; r.gastoCent = c }' },
      { nombre: 'erroresAcreditar no mira lo escrito', de: '        if (r.error) e.push(r.error)\n', a: '' },
      // Lo que se dice en vivo
      { nombre: 'el % sin multiplicar por 100', de: 'const pct = r.importeCent ? r.gastoCent * 100 / r.importeCent : 0', a: 'const pct = r.importeCent ? r.gastoCent / r.importeCent : 0' },
      { nombre: 'la venta sin diferencia dice "se carga como gasto"', de: "        if (!r.gastoCent) return { texto: 'Sin diferencia: no se carga gasto.', error: false }\n", a: '' },
      { nombre: 'el depósito dice "gasto $ 0,00" en vez de "sin gasto"', de: "r.gastoCent ? `gasto ${formatearImporte(r.gastoCent / 100)}` : 'sin gasto'", a: '`gasto ${formatearImporte(r.gastoCent / 100)}`' },
      { nombre: 'el error en vivo no se marca', de: '      if (r.error) return { texto: r.error, error: true }', a: '      if (r.error) return { texto: r.error, error: false }' },
      // Lo que viaja
      { nombre: 'acreditado en centavos', de: '          if (r.venta) item.acreditado = r.acreditadoCent / 100', a: '          if (r.venta) item.acreditado = r.acreditadoCent' },
      { nombre: 'gastos en centavos', de: '          else item.gastos = r.gastoCent / 100', a: '          else item.gastos = r.gastoCent' },
      { nombre: 'la venta manda "gastos" en vez de "acreditado"', de: '          if (r.venta) item.acreditado = r.acreditadoCent / 100', a: '          if (r.venta) item.gastos = r.gastoCent / 100' },
      { nombre: 'el depósito no manda sus gastos', de: '          else item.gastos = r.gastoCent / 100\n', a: '' },
      { nombre: 'uno mal escrito viaja igual', de: '          if (r.error) return item\n', a: '' },
      { nombre: 'confirmar no manda lo escrito', de: "parametrosAcreditar(cheques, fecha, bancoUI.valores))", a: "parametrosAcreditar(cheques, fecha))" },
      { nombre: 'confirmar no valida lo escrito', de: 'erroresAcreditar(cheques, fecha, hoyArgentina(), bancoUI.valores)', a: 'erroresAcreditar(cheques, fecha, hoyArgentina())' },
      // La pantalla
      { nombre: 'abrir no olvida lo escrito antes', de: "      bancoUI.resultado = ''\n      bancoUI.valores = new Map()\n", a: "      bancoUI.resultado = ''\n" },
      { nombre: 'rehacer la lista pisa lo escrito', de: 'for (const ch of cheques) if (!bancoUI.valores.has(ch.id)) bancoUI.valores.set(ch.id, textoInicialAcreditar(ch))', a: 'for (const ch of cheques) bancoUI.valores.set(ch.id, textoInicialAcreditar(ch))' },
      { nombre: 'los campos sin el formato argentino', de: '        enlazarCampoNumero(input, { decimales: 2 })\n        if (input.value !== bancoUI.valores.get(ch.id)) {', a: '        if (input.value !== bancoUI.valores.get(ch.id)) {' },
      { nombre: 'escribir no dice nada en vivo', de: '      bancoUI.valores.set(id, String(texto ?? \'\'))\n      pintarVivoAcreditar(ch)\n', a: '      bancoUI.valores.set(id, String(texto ?? \'\'))\n' },
      { nombre: 'escribir no saca el error de antes', de: "      pintarVivoAcreditar(ch)\n      document.getElementById('chq-acr-error').hidden = true\n", a: '      pintarVivoAcreditar(ch)\n' },
      { nombre: 'escribir no rehace el resumen', de: "      document.getElementById('chq-acr-error').hidden = true\n      pintarResumenAcreditar()\n    }\n", a: "      document.getElementById('chq-acr-error').hidden = true\n    }\n" },
      { nombre: 'el vivo no se marca en rojo', de: "      el.classList.toggle('chq-acr-fila__vivo--error', vivo.error)\n", a: '' },
      { nombre: 'el resumen no suma los gastos', de: "      html += fila('Gasto del banco', formatearImporte(t.gastoCent / 100))\n", a: "      html += fila('Gasto del banco', formatearImporte(0))\n" },
      { nombre: 'lo que queda en la cuenta sin restar el gasto', de: 'formatearImporte((t.brutoCent - t.gastoCent) / 100))', a: 'formatearImporte(t.brutoCent / 100))' },
      { nombre: 'el resumen no avisa los montos para corregir', de: '      if (t.conError) html +=', a: '      if (false) html +=' },
      { nombre: 'los totales no cuentan los mal escritos', de: '        if (r.error) conError++\n', a: '        if (r.error) {}\n' },
      { nombre: 'con gasto, igual dice "No se carga ningún gasto."', de: '      const gasto = t.gastoCent > 0\n', a: '      const gasto = false\n' },
      { nombre: 'la lista no escucha lo que se escribe', de: "        if (t) alEscribirAcreditar(t.dataset.acrMonto, t.value)\n", a: '' },
      { nombre: 'después de acreditar no se olvida lo escrito', de: "        bancoUI.panel = null\n        bancoUI.valores = new Map()\n", a: '        bancoUI.panel = null\n' },
      // El aviso y el resultado
      { nombre: 'el aviso no dice los gastos', de: 'mostrarExito(`${acreditados} ${textoGastosAcreditar(data)}`.trim())', a: 'mostrarExito(acreditados)' },
      { nombre: 'el aviso cuenta también los gastos en cero', de: '      const gastos = res.filter(r => aCentavos(r?.gastos) > 0)\n      if (!gastos.length) return', a: '      const gastos = res\n      if (!gastos.length) return' },
      { nombre: 'el aviso dice "venta" también en los depósitos', de: "      return modo === 'venta' ? 'venta' : 'depósito'", a: "      return 'venta'" },
      { nombre: 'el resultado: lo acreditado (neto) y no lo que entró (bruto)', de: 'aCentavos(r?.bruto ?? r?.acreditado))', a: 'aCentavos(r?.acreditado ?? r?.bruto))' },
      { nombre: 'el resultado junta todas las cuentas', de: "        const k = String(r?.cuenta ?? 'la cuenta')\n", a: "        const k = 'la cuenta'\n" },
      { nombre: 'el resultado sin "Ver el gasto"', de: "        const linkGasto = gid ?", a: "        const linkGasto = false ?" },
      { nombre: '"Ver el gasto" sin encodeURIComponent', de: 'href="gastos.html?gasto=${encodeURIComponent(gid)}">Ver el gasto</a>` : \'\'\n        const texto', a: 'href="gastos.html?gasto=${gid}">Ver el gasto</a>` : \'\'\n        const texto' },
      { nombre: 'el resultado no dice que no se cargó ningún gasto', de: '      if (filas.length && !gastos.length) lineas.push(', a: '      if (false) lineas.push(' },
      { nombre: 'el resultado dice gastos en cero', de: '      const gastos = filas.filter(r => aCentavos(r?.gastos) > 0)\n', a: '      const gastos = filas\n' },
      // "Ver el gasto" en el depositado
      { nombre: 'el depositado sin "Ver el gasto"', de: "return (ch?.estado === 'vendido' || ch?.estado === 'depositado') && ch.venta_gasto_id", a: "return ch?.estado === 'vendido' && ch.venta_gasto_id" },
      { nombre: '"Ver el gasto" en cualquier estado', de: "return (ch?.estado === 'vendido' || ch?.estado === 'depositado') && ch.venta_gasto_id", a: 'return ch.venta_gasto_id' },
    ],
  },
])
