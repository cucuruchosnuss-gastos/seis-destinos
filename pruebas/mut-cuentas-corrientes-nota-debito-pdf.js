// Mutaciones de test-cuentas-corrientes-nota-debito-pdf.js ("Ver PDF" de una
// nota de débito de proveedor). Ver mutar.js. De a una.
//
//   node pruebas/mut-cuentas-corrientes-nota-debito-pdf.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-nota-debito-pdf.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  // Automáticas: el esc() del id del botón y del error (las demás de la
  // función ya las cubren las suites de la cuenta; acá van a mano).
  funciones: [],
  manuales: [
    { nombre: 'no se lee archivo_url',
      de: ".select('id, factura_pendiente_id, comprobante, estado, archivo_url')", a: ".select('id, factura_pendiente_id, comprobante, estado')" },
    { nombre: '"Ver PDF" aunque no haya archivo',
      de: '        const botonPdfNd = notaNd?.archivo_url\n', a: '        const botonPdfNd = notaNd\n' },
    { nombre: 'el id del botón sin escapar',
      de: 'data-ver-pdf-nd="${esc(notaNd.id)}">Ver PDF', a: 'data-ver-pdf-nd="${notaNd.id}">Ver PDF' },
    { nombre: 'el error del PDF sin escapar',
      de: "${esc('No se pudo abrir el PDF: ' + estado.ficha.errorPdfNd.mensaje)}", a: "${'No se pudo abrir el PDF: ' + estado.ficha.errorPdfNd.mensaje}" },
    { nombre: 'el error del PDF tapado',
      de: "        mensaje = err?.message || 'No se pudo abrir el PDF.'\n", a: "        mensaje = 'No se pudo abrir el PDF.'\n" },
    { nombre: 'el error del PDF en todas las notas',
      de: '        const errorPdfNd = notaNd && estado.ficha.errorPdfNd?.notaId === notaNd.id\n', a: '        const errorPdfNd = notaNd && estado.ficha.errorPdfNd\n' },
    { nombre: 'el error no se muestra',
      de: '              ${errorPdfNd}\n', a: '' },
    { nombre: 'el botón no se dibuja',
      de: '            ${botonPdfNd}\n', a: '' },
    { nombre: 'otro bucket',
      de: "    const BUCKET_PDF_ND = 'comprobantes'", a: "    const BUCKET_PDF_ND = 'notas-debito'" },
    { nombre: 'una hora en vez de 5 minutos',
      de: '    const SEGUNDOS_FIRMA_PDF_ND = 300', a: '    const SEGUNDOS_FIRMA_PDF_ND = 3600' },
    { nombre: 'la pestaña se abre después de esperar (la frena el navegador): sin pestaña',
      de: "      const pestana = typeof window !== 'undefined' && window.open ? window.open('', '_blank') : null\n", a: '      const pestana = null\n' },
    { nombre: 'la pestaña queda con opener',
      de: '        if (pestana) { pestana.opener = null; pestana.location.href = data.signedUrl }', a: '        if (pestana) { pestana.location.href = data.signedUrl }' },
    { nombre: 'si falla, la pestaña queda abierta en blanco',
      de: '        if (pestana) pestana.close()\n        mensaje', a: '        mensaje' },
    { nombre: 'una firma sin link pasa como buena',
      de: "        if (!data?.signedUrl) throw new Error('La base no devolvió el link del PDF.')\n", a: '' },
    { nombre: 'una firma con error pasa como buena',
      de: '        if (error) throw error\n        if (!data?.signedUrl)', a: '        if (!data?.signedUrl)' },
    { nombre: 'al volver a andar, el error queda',
      de: '      ficha.errorPdfNd = mensaje ? { notaId, mensaje } : null\n', a: '      if (mensaje) ficha.errorPdfNd = { notaId, mensaje }\n' },
    { nombre: 'sin mirar si la ficha cambió',
      de: '      if (estado.ficha !== ficha) return\n      ficha.errorPdfNd', a: '      if (false) return\n      ficha.errorPdfNd' },
    { nombre: 'sin archivo_url igual firma',
      de: '      const ruta = nota?.archivo_url\n      if (!ruta) return\n', a: '      const ruta = nota?.archivo_url\n' },
    { nombre: 'el click no está enlazado',
      de: "        btn.addEventListener('click', () => verPdfNd(btn.dataset.verPdfNd))", a: "        btn.addEventListener('click', () => {})" },
    { nombre: 'sin flex-wrap (en el celular se sale de la fila)',
      de: '<div style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:0.375rem; align-items:center; margin-top:0.375rem;">\n            <a href="gastos.html',
      a: '<div style="display:flex; gap:0.375rem; align-items:center; margin-top:0.375rem;">\n            <a href="gastos.html' },
  ],
})
