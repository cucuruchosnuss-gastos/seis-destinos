// Mutaciones de test-materia-prima-fotos.js. Ver mutar.js (los tres guards:
// suite verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-materia-prima-fotos.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-fotos.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: [],
  manuales: [
    { nombre: 'subirArchivoMp vuelve a firmar a 10 años y devuelve la URL',
      de: '      return data?.path || path\n    }',
      a: "      const { data: firmada } = await supabase.storage.from(BUCKET_FOTOS_MP).createSignedUrl(data.path, 60 * 60 * 24 * 365 * 10)\n      return firmada.signedUrl\n    }" },
    { nombre: 'la firma al mirar pasa a 10 años',
      de: 'const SEGUNDOS_FIRMA_FOTO_MP = 300', a: 'const SEGUNDOS_FIRMA_FOTO_MP = 60 * 60 * 24 * 365 * 10' },
    { nombre: 'no se extrae la ruta de la URL vieja (se firma la URL entera)',
      de: '        try { v = decodeURIComponent(m[1]) } catch { return null }', a: '        void m' },
    { nombre: 'rutaFotoMp deja pasar cualquier esquema tal cual',
      de: '      if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {', a: '      if (/^https:/i.test(v) && false) {' },
    { nombre: 'rutaFotoMp acepta URLs de cualquier forma (sin exigir la de Storage)',
      de: '        if (!m) return null\n        try { v = decodeURIComponent', a: '        if (!m) return v\n        try { v = decodeURIComponent' },
    { nombre: 'rutaFotoMp deja de validar los segmentos',
      de: "      if (partes.some(p => !segmentoValido.test(p) || p === '.' || p === '..')) return null", a: '      void segmentoValido' },
    { nombre: 'el detalle vuelve a poner el valor crudo de la base en un href',
      de: '<button type="button" data-ruta-foto="${esc(rutaFotoMp(c.foto_url))}" class="comprobante-mp__foto">Ver foto →</button>',
      a: '<a href="${esc(c.foto_url)}" data-ruta-foto="${esc(rutaFotoMp(c.foto_url))}" class="comprobante-mp__foto">Ver foto →</a>' },
    { nombre: 'el detalle pone la URL vieja entera en el botón',
      de: 'data-ruta-foto="${esc(rutaFotoMp(c.foto_url))}"', a: 'data-ruta-foto="${esc(c.foto_url)}"' },
    { nombre: 'abrirFotoMp abre la ruta cruda en vez de la URL firmada',
      de: '      if (ventana) ventana.location.href = r.url', a: '      if (ventana) ventana.location.href = ruta' },
    { nombre: 'sin reintento tras refrescar la sesión',
      de: '        if (!errorRefresco) ({ data, error } = await pedir())', a: '        void errorRefresco' },
    { nombre: 'una excepción de la firma rompe abrirFotoMp',
      de: '        r = await firmarFotoMp(ruta)\n      } catch (e) {\n        r = { url: null, falla: \'otro\', error: e }\n      }',
      a: '        r = await firmarFotoMp(ruta)\n      } finally {}' },
    { nombre: 'un error de firma deja la pestaña en blanco abierta',
      de: '        ventana?.close()\n        console.error(\'[foto ingreso]', a: '        console.error(\'[foto ingreso]' },
    { nombre: 'el OCR vuelve a recibir la ruta en vez del archivo',
      de: '        const imagen_base64 = await fileABase64(w.foto.archivo)', a: '        const imagen_base64 = w.foto.url' },
    { nombre: 'la extensión del archivo no se limpia',
      de: ".toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg').slice(0, 8)", a: ".toLowerCase() || 'jpg')" },
  ],
})
