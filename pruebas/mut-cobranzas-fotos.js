// Mutaciones de test-cobranzas-fotos.js. Ver mutar.js.
//
//   node pruebas/mut-cobranzas-fotos.js
//
// Las automáticas sacan cada escCob() de htmlAvisoFoto(). Las de a mano rompen,
// de a una, cada garantía del cambio: la marca enCurso (el guard, el finally y
// que no se persista), el texto de señal durante la subida, el contador que se
// apaga, el aviso de más de 90 s y los reintentos con el formulario abierto.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-fotos.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: ['htmlAvisoFoto'],
  escape: 'escCob',
  equivalentes: [
    { expr: 'escCob(textoLecturaFoto(segundos))',
      motivo: 'textoLecturaFoto() arma el texto con un número y literales del código, sin ningún carácter escapable (el "…" no se escapa): la página sale idéntica' },
    { expr: 'escCob(textoChequesLeidos(chequesDeLaFoto))',
      motivo: 'textoChequesLeidos() arma el texto con un número y literales del código, sin ningún carácter escapable (el "✓" no se escapa): la página sale idéntica' },
  ],
  manuales: [
    // ── La marca enCurso ────────────────────────────────────────────────────
    { nombre: 'sin el guard de enCurso (dos procesarFoto a la vez)',
      de: '      if (foto.enCurso) return\n', a: '' },
    { nombre: 'el finally no libera enCurso',
      de: '        marcarFotoEnMemoria(foto, { enCurso: false, fase: null, leyendoDesde: null })',
      a: '        marcarFotoEnMemoria(foto, { fase: null, leyendoDesde: null })' },
    { nombre: 'enCurso se libera fuera del finally (solo en el camino feliz)',
      de: "      } finally {\n        marcarFotoEnMemoria(foto, { enCurso: false, fase: null, leyendoDesde: null })",
      a: "        marcarFotoEnMemoria(foto, { enCurso: false, fase: null, leyendoDesde: null })\n      } catch (e) { throw e } finally {" },
    { nombre: 'las marcas en memoria se persisten en el borrador (enumerables)',
      de: 'writable: true, configurable: true, enumerable: false', a: 'writable: true, configurable: true, enumerable: true' },
    // ── El texto de señal ───────────────────────────────────────────────────
    { nombre: 'vuelve el texto de señal durante la subida',
      de: 'Foto ${i + 1}: Subiendo la foto…</div>',
      a: 'Foto ${i + 1}: guardada en el celular. Se va a leer cuando vuelva la señal.</div>' },
    { nombre: '"sin señal" aunque haya red',
      de: 'return !navigator.onLine || !!foto.errorRed', a: 'return true' },
    { nombre: 'la subida trata todo error como falta de red',
      de: '            if (esErrorDeRed(err)) {\n              // Falta de señal', a: '            if (true) {\n              // Falta de señal' },
    { nombre: 'el OCR no mira el error original de red (.context)',
      de: 'if (esErrorDeRed(err) || esErrorDeRed(err?.context)) {', a: 'if (esErrorDeRed(err)) {' },
    { nombre: 'el error del lector ignora el mensaje de la función',
      de: '        if (cuerpo?.mensaje) return String(cuerpo.mensaje)\n', a: '' },
    // ── El contador ─────────────────────────────────────────────────────────
    { nombre: 'el contador no se limpia (sin clearInterval)',
      de: '      clearInterval(contadorLecturas)\n', a: '' },
    { nombre: 'asegurarContadorLecturas no apaga el contador cuando nadie lee',
      de: '      if (!hayFotosLeyendo()) { detenerContadorLecturas(); return }\n      if (contadorLecturas) return',
      a: '      if (!hayFotosLeyendo()) return\n      if (contadorLecturas) return' },
    { nombre: 'un intervalo de contador por render (sin el "ya está corriendo")',
      de: '      if (contadorLecturas) return\n      contadorLecturas = setInterval', a: '      contadorLecturas = setInterval' },
    { nombre: 'falta el mensaje de más de 90 s',
      de: '        ? `${base} Está tardando más de lo normal. Podés seguir cargando; se completa sola.`', a: '        ? base' },
    { nombre: 'el aviso de demora sale desde el segundo 0',
      de: 'return s > SEGUNDOS_LECTURA_LENTA', a: 'return s >= 0' },
    { nombre: 'singular mal: "1 cheques leídos"',
      de: "n === 1 ? '✓ 1 cheque leído'", a: "n === -1 ? '✓ 1 cheque leído'" },
    { nombre: 'sin el ✓ en la miniatura',
      de: "${fotoLeidaSinProblemas(foto, f) ? ' ✓' : ''}", a: '' },
    // ── Reintentos con el formulario abierto ────────────────────────────────
    { nombre: 'falta el reintento en "online"',
      de: "      window.addEventListener('online', reintentar)\n", a: '' },
    { nombre: 'falta el reintento cada 30 s',
      de: 'setInterval(reintentar, MS_REINTENTO_FOTOS)', a: 'null' },
    { nombre: 'pintarFormulario no arranca los reintentos',
      de: '      // solas. Idempotente: si ya estaban corriendo, no arranca otro.\n      iniciarReintentosFotos()\n',
      a: '      // solas. Idempotente: si ya estaban corriendo, no arranca otro.\n' },
    { nombre: 'iniciarReintentosFotos no es idempotente',
      de: '      if (reintentoFotos) return\n      const reintentar', a: '      const reintentar' },
    { nombre: 'salir del formulario no detiene los reintentos',
      de: "      if (id !== 'form') detenerReintentosFotos()\n", a: '' },
    { nombre: 'detener no quita el listener de "online"',
      de: "      window.removeEventListener('online', reintentoFotos.reintentar)\n", a: '' },
    { nombre: 'detener no apaga el contador',
      de: '    function detenerReintentosFotos() {\n      detenerContadorLecturas()\n', a: '    function detenerReintentosFotos() {\n' },
    { nombre: 'el reintento no espera al sincronizador',
      de: '      if (estado.sincronizando) return\n      if (!navigator.onLine) { pintarEstadoFotos(); return }',
      a: '      if (!navigator.onLine) { pintarEstadoFotos(); return }' },
    { nombre: 'el reintento ignora el tope de intentos del lector',
      de: '        if ((foto.intentosLector ?? 0) >= MAX_INTENTOS_LECTOR) continue\n', a: '' },
  ],
})
