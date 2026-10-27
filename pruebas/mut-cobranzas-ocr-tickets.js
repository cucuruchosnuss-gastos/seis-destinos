// Mutaciones de test-cobranzas-ocr-tickets.js (depósito en efectivo, cuenta
// por CBU, lo crudo con la lectura fallida y comprobantes de a uno;
// 27/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cobranzas-ocr-tickets.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-ocr-tickets.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cobranzas.html'),
  funciones: [],
  manuales: [
    // Depósito en efectivo
    { nombre: 'el medio leído no se toma', de: "      t.medio = pr?.medio === 'deposito_efectivo' ? 'deposito_efectivo' : 'transferencia'\n", a: '' },
    { nombre: 'la tarjeta no dice "Depósito en efectivo"', de: "${deposito ? escCob(NOTA_DEPOSITO) : 'Transferencia'} ${escCob(i + 1)}", a: "Transferencia ${escCob(i + 1)}" },
    { nombre: 'el depósito viaja sin la nota', de: '        banco_origen: bancoOrigenParaBase(t),', a: '        banco_origen: c.banco_origen,' },
    { nombre: 'la nota sin tope de 80', de: "      return [NOTA_DEPOSITO, banco].filter(Boolean).join(' · ').slice(0, 80)", a: "      return [NOTA_DEPOSITO, banco].filter(Boolean).join(' · ')" },
    { nombre: 'la nota no se separa al volver de la base', de: '      const { medio, banco_origen } = separarNotaDeposito(t.banco_origen)', a: "      const medio = 'transferencia', banco_origen = t.banco_origen ?? ''" },
    { nombre: 'cualquier banco que empiece igual es depósito', de: "      if (b !== NOTA_DEPOSITO && !b.startsWith(NOTA_DEPOSITO + ' · ')) return", a: '      if (!b.startsWith(NOTA_DEPOSITO)) return' },
    { nombre: 'cambiar el medio no es corrección', de: "        (pr.medio === 'deposito_efectivo') === esDeposito(t)\n", a: '        true\n' },
    { nombre: 'se acepta cualquier medio', de: "      if (campo === 'medio' && !MEDIOS_TRANSFERENCIA.includes(valor)) return\n", a: '' },
    { nombre: 'tocar el medio no hace nada', de: "      else if (d.transfMedio) actualizarTransferencia(d.transfId, 'medio', d.transfMedio)\n", a: '' },
    { nombre: 'cambiar el medio no repinta', de: "      if (campo === 'medio') pintarFormasNuevas()\n      else pintarErroresForma", a: '      pintarErroresForma' },
    { nombre: 'el depósito exige quién pagó', de: "      if (!t?.cuenta_id) errores.push('Elegí la cuenta de banco donde entró.')\n", a: "      if (!t?.cuenta_id) errores.push('Elegí la cuenta de banco donde entró.')\n      if (!String(t?.ordenante ?? '').trim()) errores.push('Falta quién transfirió.')\n" },
    // Cuenta por CBU
    { nombre: 'el CBU no preselecciona', de: '      const cuenta = cuentaPorCbu(pr?.cbu_destino)\n', a: '      const cuenta = null\n' },
    { nombre: 'el CBU busca en todas las cuentas', de: '      const iguales = cuentasParaElegir(null).filter(', a: '      const iguales = (estado.cuentasBancoLista ?? []).filter(' },
    { nombre: 'con dos iguales elige la primera', de: '      return iguales.length === 1 ? iguales[0] : null', a: '      return iguales[0] ?? null' },
    { nombre: 'el CBU sin mirar el largo', de: '      if (buscado.length !== 22) return null\n', a: '' },
    { nombre: 'el CBU sin sacar los espacios', de: "      const buscado = String(cbu ?? '').replace(/\\D/g, '')", a: "      const buscado = String(cbu ?? '')" },
    { nombre: 'cambiar la cuenta deja el aviso del CBU', de: '        t.cuentaPorCbu = false\n', a: '' },
    { nombre: 'las cuentas se leen sin cbu', de: 'empleado_id, activa, cbu\')', a: 'empleado_id, activa\')' },
    // Lo crudo con la lectura fallida
    { nombre: 'ok:false no archiva lo crudo', de: '        // papel de lo que respondió el modelo.\n        foto.ocr_modelo = data?.modelo ?? null\n        foto.ocr_crudo = data?.crudo ?? null\n', a: "        // papel de lo que respondió el modelo.\n        foto.ocr_modelo = data?.modelo ?? null\n        foto.ocr_crudo = data?.ok ? (data?.crudo ?? null) : null\n" },
    { nombre: 'el error con cuerpo no archiva lo crudo', de: '          foto.ocr_crudo = cuerpo.crudo\n', a: '' },
    { nombre: 'el error con cuerpo pierde el mensaje', de: "        const detalle = cuerpo?.mensaje ? String(cuerpo.mensaje) : (err?.message || 'error desconocido')", a: "        const detalle = err?.message || 'error desconocido'" },
    { nombre: '"Cargalo a mano" se repite', de: ".replace(/\\s*Cargalo a mano\\.?\\s*$/, '') + ' Cargalo a mano: el", a: " + ' Cargalo a mano: el" },
    // De a uno
    { nombre: 'los comprobantes se leen todos a la vez', de: '      await anterior\n      marcarFotoEnMemoria(foto, { fase: \'leyendo\'', a: '      marcarFotoEnMemoria(foto, { fase: \'leyendo\'' },
    { nombre: 'una falla traba la fila', de: '      } finally {\n        soltarTurno()\n      }', a: '      }\n      soltarTurno()' },
    { nombre: 'los que esperan no lo dicen', de: "      else if (foto.enCurso && foto.fase === 'en_espera') texto = 'en espera: se lee cuando termine el anterior.'\n", a: '' },
    { nombre: 'la fila no se libera', de: "      return () => { estado.lecturasComprobantes--; soltar() }", a: '      return () => { soltar() }' },
  ],
})
