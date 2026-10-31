// Mutaciones de test-administracion-division-orden.js (la condición de venta
// del cliente, la configuración de las comisiones de los 3 vendedores y la
// ficha, 21/10/2026). Desde el 28/10/2026 la orden (los puntos N1 / N2, el
// papel y las facturas) la muta mut-administracion-valorizar-con-division.js.
// Ver mutar.js.
//
//   node pruebas/mut-administracion-division-orden.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const FORMATEADO = 'un % formateado por el código (textoPct): sin texto de la base'
const CONSTANTE = 'texto constante del código'

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-division-orden.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlVendedoresPct', 'pintarComisiones', 'pintarVendedoresFicha'],
  equivalentes: [
    { expr: 'esc(id)', motivo: 'el prefijo del campo con el orden del vendedor pasado por Number()' },
    { expr: "esc('Volver al de la configuración (' + textoPct(f.defecto) + ' %)')", motivo: FORMATEADO },
    { expr: 'esc(c.error)', motivo: CONSTANTE + ' (cargarComisiones solo pone uno fijo)' },
    { expr: 'esc(textoTotalComisiones(c))', motivo: FORMATEADO },
    { expr: 'esc(c.errorVendedores)', motivo: CONSTANTE + ' (cargarVendedoresFicha solo pone uno fijo)' },
  ],
  manuales: [
    { nombre: 'el complemento sin redondear', de: '      return Math.round((100 - n) * 100) / 100', a: '      return 100 - n' },
    { nombre: 'el complemento acepta fuera de 0 a 100', de: '      if (!Number.isFinite(n) || n < 0 || n > 100) return null\n      return Math.round', a: '      if (!Number.isFinite(n)) return null\n      return Math.round' },
    { nombre: 'la ficha no completa el otro %', de: '      ponerNumero(document.getElementById(idOtro), complementoPct(leerCampoNumero(document.getElementById(idCampo))))', a: '      ponerNumero(document.getElementById(idOtro), leerCampoNumero(document.getElementById(idCampo)))' },
    { nombre: 'la suma de % con coma flotante', de: '      return ns.reduce((s, n) => s + Math.round(n * 100), 0) / 100', a: '      return ns.reduce((s, n) => s + n, 0)' },
    { nombre: 'la sección se ve sin retiros:precios', de: "{ id: 'comisiones', titulo: 'Configuración de comisiones', global: true, tareas: ['retiros:precios'] }", a: "{ id: 'comisiones', titulo: 'Configuración de comisiones', global: true, tareas: ['retiros:precios', 'retiros:ver'] }" },
    { nombre: 'la configuración guarda el % viejo', de: '{ p_vendedor_id: vendedorId, p_pct: pct }', a: '{ p_vendedor_id: vendedorId, p_pct: numeroONulo(v.pct_defecto) }' },
    { nombre: 'la configuración: tipear no cambia nada', de: '      c.valores[vendedorId] = valor\n', a: '' },
    { nombre: 'la configuración se manda sin validar', de: '      if (e.error) { pintarComisiones(); return }\n', a: '' },
    { nombre: 'la configuración: doble toque manda dos', de: '      if (e.enviando) return\n      const pct = numeroONulo(c.valores[vendedorId])', a: '      const pct = numeroONulo(c.valores[vendedorId])' },
    { nombre: 'la configuración: el error de la base se tapa', de: "e.error = err?.message || 'No se pudo guardar. Probá de nuevo.'", a: "e.error = 'No se pudo guardar. Probá de nuevo.'" },
    { nombre: 'la ficha no lee la condición', de: 'comision_habitual, pct_parte_a, proveedor_id, observaciones', a: 'comision_habitual, proveedor_id, observaciones' },
    { nombre: 'la ficha no muestra la condición', de: '        llenarCondicionVenta(c)\n', a: '' },
    { nombre: 'la ficha no lee los propios del cliente', de: '        const propio = propias?.[v.id] !== undefined && propias?.[v.id] !== null', a: '        const propio = false' },
    { nombre: 'cambiar un vendedor no lo deja propio', de: '      v.pct = valor\n      v.propio = true\n', a: '      v.pct = valor\n' },
    { nombre: 'volver a la configuración no vuelve', de: '      v.propio = false\n      v.pct = v.defecto\n      marcarCondicionTocada()\n      pintarVendedoresFicha()', a: '      marcarCondicionTocada()\n      pintarVendedoresFicha()' },
    { nombre: 'el de la configuración viaja con su %', de: 'pct: v.propio ? numeroONulo(v.pct) : null', a: 'pct: numeroONulo(v.pct)' },
    { nombre: 'un propio vaciado no vuelve a la configuración', de: '        for (const v of c.vendedores ?? []) if (v.propio && numeroONulo(v.pct) === null) { v.propio = false; v.pct = v.defecto }\n', a: '' },
    { nombre: 'A vacío viaja como 0', de: '{ p_cliente_id: f.id, p_pct_a: pctA, p_comisiones: comisiones }', a: '{ p_cliente_id: f.id, p_pct_a: pctA ?? 0, p_comisiones: comisiones }' },
    { nombre: 'la condición se manda sin validar', de: '      if (c.error) { if (estado.ficha === f) pintarCondicionVenta(); return false }\n', a: '' },
    { nombre: 'la condición: doble toque manda dos', de: "      if (c.enviando) return false\n      const pctA = leerCampoNumero(document.getElementById('ad-f-pct-a'))", a: "      const pctA = leerCampoNumero(document.getElementById('ad-f-pct-a'))" },
    { nombre: 'la condición: el error de la base se tapa', de: "c.error = err?.message || 'No se pudo guardar la condición de venta. Probá de nuevo.'", a: "c.error = 'No se pudo guardar la condición de venta. Probá de nuevo.'" },
    { nombre: 'la condición: las órdenes no se enteran', de: '        // Las órdenes leen la condición de la lista de clientes: que la relea.\n        estado.clientes = null\n', a: '' },
    { nombre: 'los renglones en 0 se imprimen', de: 'return Number.isFinite(n) && n !== 0 })', a: 'return Number.isFinite(n) })' },
    // La ficha no pierde la condición en silencio (30/10/2026, ci-prueba/condicion-venta-sin-defecto)
    // Arreglos 30/10 (punto 6): salir de la ficha pasa por retenerEnFicha.
    { nombre: 'salir de la ficha no la guarda', de: "      if (estado.vista === 'ad-vista-ficha' && id !== 'ad-vista-ficha' && retenerEnFicha(() => mostrarVista(id))) return\n", a: '' },
    { nombre: 'salir sin avisar si falla', de: "        mostrarError(`No se guardó la condición de venta de ${f.original", a: "        if (false) mostrarError(`No se guardó la condición de venta de ${f.original" },
    { nombre: 'cambiar un vendedor no cuenta', de: '      v.propio = true\n      marcarCondicionTocada()', a: '      v.propio = true' },
    { nombre: 'volver a la configuración no cuenta', de: '      v.pct = v.defecto\n      marcarCondicionTocada()\n', a: '      v.pct = v.defecto\n' },
    { nombre: 'guardada nunca se marca', de: '        c.guardadaVersion = Math.max(c.guardadaVersion ?? 0, version)\n', a: '' },
    { nombre: 'siempre sin guardar', de: '      return !!f?.original && !!c && (c.version ?? 0) > (c.guardadaVersion ?? 0)', a: '      return !!f?.original && !!c' },
    { nombre: '"Guardar la ficha" no guarda la condición', de: '      if (f?.original && !estado.trabajando && condicionSinGuardar(f)) {', a: '      if (false) {' },
    { nombre: '"Guardar la ficha" sigue aunque la condición falle', de: "          if (estado.ficha === f) { f.error = 'No se guardó la condición de venta: ' + (f.condicion.error ?? 'revisala.'); pintarPieFicha() }\n          return\n", a: '' },
    { nombre: '"No cambiaste nada" con la condición guardada', de: "        f.error = conCondicion ? null : 'No cambiaste nada.'", a: "        f.error = 'No cambiaste nada.'" },
    { nombre: 'sin el texto escrito de lo guardado', de: '        c.mensaje = textoCondicionGuardada(pctA)\n        mostrarExito(c.mensaje + \'.\')', a: "        mostrarExito(textoCondicionGuardada(pctA) + '.')" },
    { nombre: 'sin preguntar al cerrar la página', de: "{ e.preventDefault(); e.returnValue = '' }", a: '{ }' },
    { nombre: 'la B con las cantidades de la A', de: "      const k = parte === 'A' ? 'a' : 'b'", a: "      const k = 'a'" },
  ],
})
