// Mutaciones de test-stock-pendientes.js. Ver mutar.js (los tres guards: suite
// verde sobre el limpio, ancla única, mutación que cambia algo). Corren de a
// una.
//
//   node pruebas/mut-stock-pendientes.js
//
// Automáticas: cada esc() de htmlBurbujaStock pierde su escape. A mano: se
// rompe COMPORTAMIENTO, y cada mutación tiene que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-pendientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/stock.html'),
  funciones: ['htmlBurbujaStock'],
  manuales: [
    // ── El número ─────────────────────────────────────────────────────────
    { nombre: 'cantidadPendiente acepta null (Number(null) = 0 pasa… y el guard se va)',
      de: "      if (c === null || c === undefined || c === '') return 0\n      const n = typeof c === 'number' ? c : Number(c)\n      return Number.isInteger(n) && n > 0 ? n : 0",
      a: "      const n = Number(c)\n      return n" },
    { nombre: 'cantidadPendiente acepta decimales',
      de: '      return Number.isInteger(n) && n > 0 ? n : 0',
      a: '      return Number.isFinite(n) && n > 0 ? n : 0' },
    { nombre: 'cantidadPendiente acepta negativos',
      de: '      return Number.isInteger(n) && n > 0 ? n : 0',
      a: '      return Number.isInteger(n) ? n : 0' },
    { nombre: 'cantidadPendiente no mira la clave (toma la primera fila del módulo)',
      de: "      const fila = (filas || []).find(f => f?.modulo === modulo && f?.clave === clave)\n      if (!fila) return 0",
      a: "      const fila = (filas || []).find(f => f?.modulo === modulo)\n      if (!fila) return 0" },
    { nombre: 'la burbuja dibuja un 0',
      de: "      if (!(n > 0)) return ''\n",
      a: "" },
    { nombre: 'sin el tope de 99+',
      de: "${n > 99 ? '99+' : n}</span>`",
      a: "${n}</span>`" },
    // ── Dónde va cada una ────────────────────────────────────────────────
    { nombre: 'la de catálogo sin chequear gestionar_catalogo',
      de: '      const nInsumos = filas && puedeGestionar()\n',
      a: '      const nInsumos = filas\n' },
    { nombre: 'las burbujas intercambiadas de lugar',
      de: "      document.getElementById('burbuja-transito').innerHTML = htmlBurbujaStock(nTransf,",
      a: "      document.getElementById('burbuja-catalogo').innerHTML = htmlBurbujaStock(nTransf," },
    { nombre: 'la de catálogo cuenta pagado_sin_ingresar',
      de: "        ? cantidadPendiente(filas, 'materia_prima', 'insumos_por_revisar') : 0",
      a: "        ? cantidadPendiente(filas, 'materia_prima', 'pagado_sin_ingresar') : 0" },
    { nombre: 'la línea de tránsito no se esconde con 0',
      de: '      aviso.hidden = nTransf === 0\n',
      a: '      aviso.hidden = false\n' },
    { nombre: 'la línea linkea a otro lado',
      de: 'href="materia-prima.html">Ir a Ingreso</a>',
      a: 'href="../materia-prima.html">Ir a Ingreso</a>' },
    { nombre: 'la línea siempre en plural',
      de: "${nTransf === 1 ? 'transferencia espera que la recibas' : 'transferencias esperan que las recibas'}",
      a: "transferencias esperan que las recibas" },
    { nombre: 'title sin el detalle',
      de: '<span class="burbuja-stock" title="${esc(detalle)}" aria-label',
      a: '<span class="burbuja-stock" aria-label' },
    // ── Fallo y turno ────────────────────────────────────────────────────
    // (Sacar el `if (error) throw error` NO es una mutación útil: con error la
    // data viene null, queda [] y pintar([]) dibuja lo mismo que pintar(null):
    // nada. Es equivalente, así que no se lista.)
    { nombre: 'en el catch queda la última respuesta buena (no null)',
      de: "        console.error('mis_pendientes:', err)\n        filas = null",
      a: "        console.error('mis_pendientes:', err)\n        return" },
    { nombre: 'sin turno: la respuesta vieja pisa',
      de: '      if (turno !== turnoPendientesStock) return\n',
      a: '' },
    // ── ?vista=catalogo ─────────────────────────────────────────────────
    { nombre: 'la vista pedida no se valida contra la lista cerrada',
      de: '      return VISTAS_DESDE_URL.includes(pedida) && vistas.includes(pedida) ? pedida : null',
      a: '      return vistas.includes(pedida) ? pedida : null' },
    { nombre: 'la vista pedida no se valida contra las vistas de la persona',
      de: '      return VISTAS_DESDE_URL.includes(pedida) && vistas.includes(pedida) ? pedida : null',
      a: '      return VISTAS_DESDE_URL.includes(pedida) ? pedida : null' },
    { nombre: 'el parámetro no se limpia',
      de: "        history.replaceState(history.state, '', window.location.pathname + (resto ? '?' + resto : '') + window.location.hash)\n",
      a: '' },
    { nombre: 'limpiar se lleva los otros parámetros',
      de: "window.location.pathname + (resto ? '?' + resto : '') + window.location.hash)",
      a: "window.location.pathname + window.location.hash)" },
    { nombre: 'el filtro Sin revisar se pone aunque no haya pendientes',
      de: '      if (contarPendientes() === 0) return\n      estado.filtro = \'pendientes\'',
      a: '      estado.filtro = \'pendientes\'' },
    { nombre: 'init no usa la vista pedida',
      de: '      mostrarVista(desdeUrl ?? vistas[0])',
      a: '      mostrarVista(vistas[0])' },
    { nombre: 'init aplica el filtro siempre',
      de: "      if (desdeUrl === 'catalogo') aplicarFiltroDesdeUrl()",
      a: "      aplicarFiltroDesdeUrl()" },
    { nombre: 'init no pide los pendientes',
      de: '      cargarPendientesStock()\n    }\n',
      a: '    }\n' },
    { nombre: 'visibilitychange sin esperar a init',
      de: "      if (document.visibilityState === 'visible' && estado.miEmpleadoId) cargarPendientesStock()",
      a: "      if (document.visibilityState === 'visible') cargarPendientesStock()" },
    // ── HTML ────────────────────────────────────────────────────────────
    { nombre: 'la burbuja de tránsito fuera del botón',
      de: 'id="btn-ver-transito">En tránsito<span id="burbuja-transito"></span></button>',
      a: 'id="btn-ver-transito">En tránsito</button><span id="burbuja-transito"></span>' },
    { nombre: 'la burbuja de catálogo fuera de la pestaña',
      de: 'data-vista="catalogo">Catálogo<span id="burbuja-catalogo"></span></button>',
      a: 'data-vista="catalogo">Catálogo</button><span id="burbuja-catalogo"></span>' },
  ],
})
