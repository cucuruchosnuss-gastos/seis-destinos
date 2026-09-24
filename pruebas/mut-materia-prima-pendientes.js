// Mutaciones de test-materia-prima-pendientes.js. Ver mutar.js.
//
//   node pruebas/mut-materia-prima-pendientes.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-pendientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: ['htmlBurbujaMp', 'pintarPendientesMp'],
  manuales: [
    { nombre: 'un fallo deja las burbujas viejas', de: '        console.error(\'mis_pendientes:\', err)\n        mapa = null\n      }\n      if (turno !== turnoPendientesMp) return\n      estado.pendientes = mapa', a: '        console.error(\'mis_pendientes:\', err)\n        return\n      }\n      if (turno !== turnoPendientesMp) return\n      estado.pendientes = mapa' },
    { nombre: 'sin turno', de: '      if (turno !== turnoPendientesMp) return\n      estado.pendientes = mapa', a: '      estado.pendientes = mapa' },
    { nombre: 'el error de la RPC no se trata como falla', de: "        const { data, error } = await supabase.rpc('mis_pendientes')\n        if (error) throw error\n", a: "        const { data, error } = await supabase.rpc('mis_pendientes')\n" },
    { nombre: 'un 0 dibuja burbuja', de: '      return Number.isInteger(n) && n > 0 ? n : null', a: '      return Number.isInteger(n) && n >= 0 ? n : null' },
    { nombre: 'un decimal cuenta', de: '      return Number.isInteger(n) && n > 0 ? n : null', a: '      return Number.isFinite(n) && n > 0 ? n : null' },
    // SIN mutación del guard de null/undefined/'' en cantidadPendiente: es
    // EQUIVALENTE hoy (Number(null) y Number('') dan 0 y Number(undefined) NaN,
    // y el `n > 0` de abajo los rechaza igual). Se deja por claridad: dice que
    // un dato ausente no es un número.
    { nombre: 'se aceptan filas de cualquier módulo', de: '        if (!PENDIENTES_DEL_MODULO.includes(clave)) continue\n', a: '' },
    { nombre: 'la burbuja de internos lee la clave equivocada', de: "htmlBurbujaMp(p?.get('stock:transferencias_por_aceptar'))", a: "htmlBurbujaMp(p?.get('materia_prima:pagado_sin_ingresar'))" },
    { nombre: 'la línea de insumos lee la clave equivocada', de: "const ins = p?.get('materia_prima:insumos_por_revisar')", a: "const ins = p?.get('stock:transferencias_por_aceptar')" },
    { nombre: 'la línea no se oculta sin insumos', de: "      if (!ins) { linea.hidden = true; linea.innerHTML = ''; return }", a: "      if (!ins) { linea.innerHTML = ''; return }" },
    { nombre: 'la línea no se muestra con insumos', de: '        <a class="linea-pendiente-mp__link" href="stock.html?vista=catalogo">Revisarlos en Stock →</a>`\n      linea.hidden = false', a: '        <a class="linea-pendiente-mp__link" href="stock.html?vista=catalogo">Revisarlos en Stock →</a>`' },
    { nombre: 'el link apunta a otra vista', de: 'href="stock.html?vista=catalogo"', a: 'href="stock.html"' },
    { nombre: 'sin tope 99+', de: "const numero = p.cantidad > 99 ? '99+' : String(p.cantidad)", a: 'const numero = String(p.cantidad)' },
    { nombre: 'la burbuja sin aria-label', de: ' aria-label="${esc(detalle)}">${esc(numero)}</span>', a: '>${esc(numero)}</span>' },
    { nombre: 'no se pide al volver a la pestaña', de: "      if (document.visibilityState === 'visible' && estado.miEmpleadoId) cargarPendientesMp()", a: "      if (false) cargarPendientesMp()" },
    { nombre: 'no se pide al abrir', de: '      // Las burbujas no frenan nada: se piden sin esperar.\n      cargarPendientesMp()\n', a: '' },
  ],
})
