// Mutaciones de test-empleados-pin.js. Ver mutar.js.
//
//   node pruebas/mut-empleados-pin.js
//
// SIN AUTOMÁTICAS: el escapado del panel lo muta y lo detecta mut-empleados-xss.js,
// que es la suite del barrido. Acá el mensaje de prueba de la base no tiene
// ningún carácter escapable, así que sacarle el esc() no cambiaría la salida y
// se reportaría como ESCAPÓ sin que falte cobertura en ningún lado.
//
// A MANO: cada decisión que la sección toma. La que más importa es la primera:
// con la RPC en null tiene que desaparecer la sección ENTERA, título incluido.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-empleados-pin.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/empleados.html'),
  funciones: [],
  manuales: [
    // ── Qué se dibuja y cuándo ────────────────────────────────────────────
    { nombre: 'con la RPC en null queda el título solo, sin nada debajo',
      de: "      if (!p.datos) return ''", a: '      if (!p.datos) return TITULO_PIN' },
    { nombre: 'con la RPC en null se dibuja la sección igual (como si no tuviera PIN)',
      de: 'if (!p.datos) return', a: 'if (false) return' },
    { nombre: 'un fallo de la llamada se muestra como si no hubiera PIN',
      de: "if (p.error) return TITULO_PIN + '<div class=\"ficha-sin-acceso\">No se pudo leer el estado del PIN.</div>'",
      a: "if (false) return TITULO_PIN + '<div class=\"ficha-sin-acceso\">No se pudo leer el estado del PIN.</div>'" },
    { nombre: 'el fallo de la llamada no se registra (queda como si hubiera contestado bien)',
      de: 'estado.pin.error = Boolean(error)', a: 'estado.pin.error = false' },
    { nombre: 'la respuesta nunca deja de estar "cargando"',
      de: 'estado.pin.cargando = false', a: 'estado.pin.cargando = true' },
    { nombre: 'una respuesta vieja pisa la ficha que está abierta ahora',
      de: 'if (estado.pin.empleadoId !== empleadoId) return', a: 'if (false) return' },

    // ── Los tres estados ──────────────────────────────────────────────────
    { nombre: 'un PIN pendiente de cambiar se muestra como PIN propio',
      de: "if (p.debe_cambiar) return { texto: 'PIN pendiente de cambiar', clase: 'chip-pin--alerta' }",
      a: "if (false) return { texto: 'PIN pendiente de cambiar', clase: 'chip-pin--alerta' }" },
    { nombre: 'quien no tiene PIN se muestra como que sí lo tiene',
      de: "if (!p?.tiene_pin) return { texto: 'Sin PIN', clase: 'chip-pin--gris' }",
      a: "if (false) return { texto: 'Sin PIN', clase: 'chip-pin--gris' }" },

    // ── Permisos: puede_asignar lo decide la base ─────────────────────────
    { nombre: 'el botón aparece aunque la base diga que no puede asignar',
      de: 'const boton = p.datos.puede_asignar', a: 'const boton = true || p.datos.puede_asignar' },
    { nombre: 'guardarPin deja de mirar puede_asignar',
      de: 'if (p.guardando || !p.datos?.puede_asignar) return', a: 'if (p.guardando) return' },
    { nombre: 'el botón dice siempre "Asignar PIN", tenga o no PIN',
      de: "${p.datos.tiene_pin ? 'Resetear PIN' : 'Asignar PIN'}", a: '${\'Asignar PIN\'}' },

    // ── El PIN que se manda ───────────────────────────────────────────────
    { nombre: 'la validación acepta cualquier cantidad de números',
      de: 'if (!new RegExp(`^[0-9]{${LARGO_PIN_PRODUCCION}}$`).test(pin)) {', a: 'if (!/^[0-9]+$/.test(pin)) {' },
    { nombre: 'el PIN viaja como número y se come los ceros a la izquierda',
      de: 'p_pin: pin }', a: 'p_pin: Number(pin) }' },

    // ── El error y el botón ───────────────────────────────────────────────
    { nombre: 'el mensaje de la base se tapa con uno genérico',
      de: "error.message || 'No se pudo guardar el PIN.'", a: "'No se pudo guardar el PIN.'" },
    { nombre: 'el error de la base va a un toast en vez de pegado al botón',
      de: "p.error_texto = error.message || 'No se pudo guardar el PIN.'",
      a: "mostrarError(error.message || 'No se pudo guardar el PIN.')" },
    { nombre: 'el error de validación va a un toast en vez de pegado al botón',
      de: 'p.error_texto = `El PIN tiene que ser de ${LARGO_PIN_PRODUCCION} números.`',
      a: 'mostrarError(`El PIN tiene que ser de ${LARGO_PIN_PRODUCCION} números.`)' },
    { nombre: 'el botón no se traba mientras se manda',
      de: 'p.guardando = true', a: 'p.guardando = false' },
    { nombre: 'el botón queda deshabilitado por lo que falta, no por estar mandando',
      de: "${p.guardando ? ' disabled' : ''}", a: "${' disabled'}" },

    // ── Después de guardar ────────────────────────────────────────────────
    { nombre: 'después de guardar no se vuelve a leer el estado de la base',
      de: 'await cargarEstadoPin(p.empleadoId)', a: 'await Promise.resolve()' },
    { nombre: 'después de guardar el panel queda abierto',
      de: 'p.panel = false\n      mostrarExito', a: 'mostrarExito' },
    { nombre: 'el PIN tipeado no se olvida al terminar de mandar',
      de: 'olvidarCampoPin()\n      p.guardando = false', a: 'p.guardando = false' },
    { nombre: 'cerrar la ficha no suelta el PIN de la persona anterior',
      de: '      reiniciarPin(null)\n', a: '' },

    // ── El campo ──────────────────────────────────────────────────────────
    { nombre: 'el campo del PIN pasa a type="number" (que se come la coma y acepta lo que no es un PIN)',
      de: '<input type="text" id="pin-valor" inputmode="numeric"', a: '<input type="number" id="pin-valor" inputmode="numeric"' },
  ],
})
