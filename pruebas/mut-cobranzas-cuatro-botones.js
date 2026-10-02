// Mutaciones de test-cobranzas-cuatro-botones.js ("¿Cómo pagó?", 02/10/2026).
// Ver mutar.js.
//
//   node pruebas/mut-cobranzas-cuatro-botones.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-cuatro-botones.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cobranzas.html'),
  // El escape de las tarjetas lo cubre el chequeo estático de
  // test-cobranzas-xss.js (toda interpolación sin escCob da rojo); acá, los
  // comprobantes, que esta suite ejecuta con marcas.
  funciones: ['htmlComprobantes', 'htmlAvisoComprobante'],
  escape: 'escCob',
  equivalentes: [
    { expr: 'escCob(n)', motivo: 'n es `Comprobante ${i + 1}`: un literal del código y un número, sin nada escapable' },
  ],
  manuales: [
    // La empresa
    { nombre: 'la empresa viene marcada con la de la barra', de: '        estado.form.unidad_id = null\n', a: '        estado.form.unidad_id = estado.unidadElegida\n' },
    { nombre: 'elegir la empresa no cambia la barra', de: '      pasarBarraAUnidad(id)\n', a: '' },
    // Los cuatro botones
    { nombre: 'el chofer ve las cuatro formas', de: "      return puedeProcesar() ? FORMAS_PAGO.slice() : ['efectivo', 'cheque']", a: '      return FORMAS_PAGO.slice()' },
    { nombre: 'el chofer abre E-cheque / Transferencia', de: '      if (!f || !formasOfrecidas().includes(forma)) return\n      if (formaAbierta', a: '      if (!f) return\n      if (formaAbierta' },
    { nombre: 'las secciones se ven sin abrirlas', de: '      return formaTieneDatos(f, forma) || f?.abiertas?.[forma] === true', a: '      return true' },
    { nombre: 'al editar, las secciones con datos no vienen abiertas', de: '      return formaTieneDatos(f, forma) || f?.abiertas?.[forma] === true', a: '      return f?.abiertas?.[forma] === true' },
    { nombre: 'una sección con datos se cierra', de: '      if (!f || formaTieneDatos(f, forma)) return\n      if (!f.abiertas) f.abiertas = {}\n      f.abiertas[forma] = false', a: '      if (!f) return\n      if (!f.abiertas) f.abiertas = {}\n      f.abiertas[forma] = false' },
    { nombre: 'tocar una abierta y vacía no la cierra', de: '        if (!formaTieneDatos(f, forma)) cerrarForma(forma)\n', a: '' },
    { nombre: '"Cerrar" se ve con datos', de: '        b.hidden = formaTieneDatos(f, forma) || !ofrecidas.includes(forma)', a: '        b.hidden = !ofrecidas.includes(forma)' },
    { nombre: 'el botón no queda apretado', de: "        b.setAttribute('aria-pressed', formaAbierta(f, forma) ? 'true' : 'false')", a: "        b.setAttribute('aria-pressed', 'false')" },
    { nombre: 'al abrir Efectivo no va el foco', de: "      if (forma === 'efectivo') document.getElementById('cob-efectivo')?.focus?.()\n", a: '' },
    { nombre: 'el chofer ve las acciones de comprobantes', de: '      document.querySelectorAll(\'[data-acciones-comprobante]\').forEach(el => { el.hidden = !admin })', a: '      document.querySelectorAll(\'[data-acciones-comprobante]\').forEach(el => { el.hidden = false })' },
    { nombre: 'la ayuda no invita a "+ Otra…"', de: '        el.textContent = formaTieneDatos(f, tipo) ? TEXTO_OTRO_COMPROBANTE[tipo] : TEXTO_PRIMER_COMPROBANTE[tipo]', a: '        el.textContent = TEXTO_PRIMER_COMPROBANTE[tipo]' },
    // Cargar a mano en cheques
    { nombre: 'el chofer ve "Cargar a mano"', de: '      btn.textContent = admin ? TEXTO_BOTON_CHEQUE_MANO_ADMIN : TEXTO_BOTON_CHEQUE_MANO', a: '      btn.textContent = TEXTO_BOTON_CHEQUE_MANO_ADMIN' },
    { nombre: 'Administración sin foto queda deshabilitada', de: '      btn.disabled = !admin && !hayFoto', a: '      btn.disabled = !hayFoto' },
    { nombre: 'Administración no carga sin foto', de: '      if (!fotos.length && puedeProcesar()) {', a: '      if (false) {' },
    { nombre: 'a Administración le pide la foto', de: '      if (!ch.foto_id && !puedeProcesar()) e.push', a: '      if (!ch.foto_id) e.push' },
    { nombre: 'al chofer no le pide la foto', de: '      if (!ch.foto_id && !puedeProcesar()) e.push', a: '      if (false) e.push' },
    // Transferencias
    { nombre: 'asentada sin empresa ofrece todas las cuentas', de: '      if (esFormAsentado(f)) lista = f.unidad_id ? todas.filter(c => c.unidad_negocio_id === f.unidad_id) : []', a: '      if (esFormAsentado(f)) lista = f.unidad_id ? todas.filter(c => c.unidad_negocio_id === f.unidad_id) : todas.slice()' },
    { nombre: 'asentada sigue a la barra y no a la empresa', de: '      if (esFormAsentado(f)) lista = f.unidad_id', a: '      if (false) lista = f.unidad_id' },
    { nombre: 'el CUIT que no cierra no se avisa', de: "      return cuitValidoCob(cuit) ? '' : 'El CUIT no cierra", a: "      return true ? '' : 'El CUIT no cierra" },
    { nombre: 'un CUIT de 10 números deja guardar', de: "      if (cuit && cuit.length !== 11) errores.push('El CUIT de quien transfirió", a: "      if (false) errores.push('El CUIT de quien transfirió" },
    { nombre: 'el CUIT viaja con guiones', de: '        cuit_ordenante: digitosONull(t.cuit_ordenante, 11),', a: '        cuit_ordenante: textoOpcional(t.cuit_ordenante),' },
    { nombre: 'la transferencia viaja sin su comprobante', de: '        foto_id: t.foto_id ?? null,\n        origen_datos: origenDatosTransferencia(t),', a: '        foto_id: null,\n        origen_datos: origenDatosTransferencia(t),' },
    { nombre: 'una transferencia corregida queda "ocr"', de: "        (pr.referencia ?? null) === a.referencia\n      return igual ? 'ocr' : 'ocr_corregido'", a: "        (pr.referencia ?? null) === a.referencia\n      return 'ocr'" },
    { nombre: 'una transferencia sin tocar queda "ocr_corregido"', de: "        (pr.referencia ?? null) === a.referencia\n      return igual ? 'ocr' : 'ocr_corregido'", a: "        (pr.referencia ?? null) === a.referencia\n      return 'ocr_corregido'" },
    { nombre: 'la cuenta cuenta como corrección', de: '        (pr.referencia ?? null) === a.referencia\n', a: "        (pr.referencia ?? null) === a.referencia && !t.cuenta_id\n" },
    { nombre: 'una transferencia a mano no es "manual"', de: "      if (!pr) return 'manual'\n      const a = camposTransferencia(t)", a: "      if (!pr) return 'ocr'\n      const a = camposTransferencia(t)" },
    // E-cheques
    { nombre: 'un e-cheque corregido queda "ocr"', de: "        (pr.emisor ?? null) === a.emisor && (pr.cuit_emisor ?? null) === a.cuit_emisor\n      return igual ? 'ocr' : 'ocr_corregido'", a: "        (pr.emisor ?? null) === a.emisor && (pr.cuit_emisor ?? null) === a.cuit_emisor\n      return 'ocr'" },
    { nombre: 'el emisor no va en titulares', de: '        titulares: nombre !== null || cuit !== null ? [{ nombre, cuit }] : [],', a: '        titulares: [],' },
    { nombre: 'la cuenta del CMC-7 no viaja', de: '        numero: String(e.numero ?? \'\'), dv_numero: null, cuenta: digitosONull(e.cuenta, 11), dv_cuenta: null,', a: '        numero: String(e.numero ?? \'\'), dv_numero: null, cuenta: null, dv_cuenta: null,' },
    { nombre: 'el e-cheque viaja sin su comprobante', de: '        id: e.id, foto_id: e.foto_id ?? null, es_echeck: true,', a: '        id: e.id, foto_id: null, es_echeck: true,' },
    { nombre: 'el e-cheque leído no se marca diferido', de: "      e.tipo = e.fecha_pago ? 'diferido' : 'comun'", a: "      e.tipo = 'comun'" },
    // El lector nuevo
    { nombre: 'el comprobante va al lector de cheques', de: "        if (tipoFoto(foto) !== 'cheque') {\n          leyoCheques", a: "        if (false) {\n          leyoCheques" },
    { nombre: 'lo leído no se propone', de: '        if (lista.length) lista.forEach(pr => f.transferencias.push(transferenciaDesdeOcr(pr, foto.id, f.fecha)))', a: '        if (false) lista.forEach(pr => f.transferencias.push(transferenciaDesdeOcr(pr, foto.id, f.fecha)))' },
    { nombre: 'el lector caído no deja la tarjeta con el comprobante', de: '        agregarPropuestos(f, foto, [])\n        await guardarBorrador()\n        return true\n      }', a: '        await guardarBorrador()\n        return true\n      }' },
    { nombre: 'el lector caído se reintenta para siempre', de: '        foto.leida = true\n        foto.error = `El lector no pudo leer el comprobante', a: '        foto.error = `El lector no pudo leer el comprobante' },
    { nombre: 'sin señal se da por leída', de: '        if (esErrorDeRed(err) || esErrorDeRed(err?.context)) {\n          foto.error = null\n          marcarFotoEnMemoria(foto, { errorRed: true })\n          return false', a: '        if (false) {\n          foto.error = null\n          marcarFotoEnMemoria(foto, { errorRed: true })\n          return false' },
    { nombre: 'el comprobante no manda su tipo al lector', de: "          body: { storage_path: foto.storage_path, tipo: tipoFoto(foto) },", a: '          body: { storage_path: foto.storage_path },' },
    // Archivos
    { nombre: 'el PDF de más de 10 MB se sube', de: '        if (Number(archivo.size) > BYTES_MAXIMO_ARCHIVO) {', a: '        if (false) {' },
    { nombre: 'el tope pasa a 11 MB', de: 'const BYTES_MAXIMO_ARCHIVO = 10 * 1024 * 1024', a: 'const BYTES_MAXIMO_ARCHIVO = 12 * 1024 * 1024' },
    { nombre: 'el PDF se comprime como imagen', de: '      if (esPdf(archivo)) {', a: '      if (false) {' },
    { nombre: 'un PDF de cheque se acepta', de: "        if (tipo === 'cheque') {\n          mostrarError('Los cheques van con foto", a: "        if (false) {\n          mostrarError('Los cheques van con foto" },
    { nombre: 'el PNG no se pasa a JPEG', de: "      return { blob, mime: 'image/jpeg', extension: 'jpg' }", a: "      return { blob: archivo, mime: archivo.type, extension: 'png' }" },
    { nombre: 'el chofer sube comprobantes', de: "      if (tipo !== 'cheque' && !puedeProcesar()) return\n      for (const archivo of archivos) {", a: '      for (const archivo of archivos) {' },
    { nombre: 'la subida va siempre como image/jpeg', de: "              .upload(foto.storage_path, foto.blob, { contentType: foto.mime || 'image/jpeg', upsert: false })\n            if (error) {\n              // Si el archivo YA existe", a: "              .upload(foto.storage_path, foto.blob, { contentType: 'image/jpeg', upsert: false })\n            if (error) {\n              // Si el archivo YA existe" },
    { nombre: 'un borrador viejo (foto sin tipo) no es de cheque', de: "      return foto?.tipo === 'echeque' || foto?.tipo === 'transferencia' ? foto.tipo : 'cheque'", a: '      return foto?.tipo' },
    { nombre: 'una foto de la base viaja con tipo', de: '        if (!x.enBase) { fila.tipo', a: '        if (true) { fila.tipo' },
    { nombre: 'un comprobante sin tarjeta viaja', de: '        return !comprobantesSinUso(f).includes(x)', a: '        return true' },
    { nombre: 'el PDF se abre en el visor', de: "      if (foto.mime !== 'application/pdf') { abrirVisor(foto, 'Comprobante'); return }", a: "      { abrirVisor(foto, 'Comprobante'); return }" },
    { nombre: 'el PDF se dibuja como imagen', de: "        const mini = foto.mime === 'application/pdf'", a: '        const mini = false' },
  ],
})
