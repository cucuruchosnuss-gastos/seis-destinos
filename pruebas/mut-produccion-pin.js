// Mutaciones de test-produccion-pin.js (el PIN, el acceso maestro y "Dar
// acceso por hoy" del rediseño). Ver mutar.js.
//
//   node pruebas/mut-produccion-pin.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-pin.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlMensajePin', 'htmlTecladoPin', 'htmlPuntosPin', 'pintarDarAcceso'],
  equivalentes: [
    { expr: 'esc(clave)', motivo: 'la clave del puesto sale de PUESTOS, una constante del código (encargado / masero / operario): ninguna salida posible tiene un carácter escapable' },
    { expr: 'esc(rotulo)', motivo: 'el rótulo del puesto sale de PUESTOS, una constante del código (Encargado / Masero / Operario): ninguna salida posible tiene un carácter escapable' },
  ],
  manuales: [
    // ── Los mensajes, uno por motivo ───────────────────────────────────────
    { nombre: 'sin_pin cae en el genérico', de: "      if (motivo === 'sin_pin') return { texto: 'Todavía no tenés PIN: pedíselo a quien configura producción.' }\n", a: '' },
    { nombre: 'sin_puesto cae en el genérico', de: "      if (motivo === 'sin_puesto') return { texto: 'No figurás en este puesto en esta fábrica. Pedí que te lo carguen en Configuración → Personal, o que te den acceso por hoy.' }\n", a: '' },
    { nombre: 'pin_vencido cae en el genérico', de: "      if (motivo === 'pin_vencido') return { texto: 'Tu PIN temporal venció. Pedí uno nuevo a quien configura producción.' }\n", a: '' },
    { nombre: 'pin_repetido cae en el genérico', de: "      if (motivo === 'pin_repetido') return { texto: 'Elegí uno distinto al que te dieron.' }\n", a: '' },
    { nombre: 'pin_incorrecto cae en el genérico', de: "      if (motivo === 'pin_incorrecto') return { texto: textoIntentos(res.intentos_restantes) }\n", a: '' },
    { nombre: 'un motivo desconocido se traga en silencio', de: "      return { texto: 'No se pudo verificar el PIN. Probá de nuevo.' }\n    }\n\n    // m:ss", a: "      return { texto: '' }\n    }\n\n    // m:ss" },

    // ── El bloqueo ─────────────────────────────────────────────────────────
    { nombre: 'la hora del bloqueo se muestra en UTC', de: '        const hora = horaArgentina(res.bloqueado_hasta)', a: '        const hora = String(res.bloqueado_hasta).slice(11, 16)' },
    { nombre: 'el bloqueado_hasta no llega a la cuenta regresiva', de: "        return { texto: hora ? `Probá de nuevo a las ${hora}` : 'Quedó bloqueado unos minutos.', bloqueadoHasta: res.bloqueado_hasta }", a: "        return { texto: hora ? `Probá de nuevo a las ${hora}` : 'Quedó bloqueado unos minutos.' }" },
    { nombre: 'la cuenta regresiva no se apaga al llegar a cero', de: '      if (!Number.isFinite(ms) || ms <= 0) return null', a: "      if (!Number.isFinite(ms)) return null\n      if (ms <= 0) return '0:00'" },
    { nombre: 'los segundos sin dos dígitos', de: "      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`", a: '      return `${Math.floor(s / 60)}:${s % 60}`' },
    { nombre: 'una fecha ilegible da NaN en vez de null', de: '      if (!Number.isFinite(ms) || ms <= 0) return null', a: '      if (ms <= 0) return null' },
    { nombre: 'el teclado no se apaga con el bloqueo', de: "      const off = bloqueado ? ' disabled' : ''", a: "      const off = ''" },
    { nombre: 'sin salida cuando está bloqueado', de: "      otra.hidden = !(p.modo === 'maestro' || reloj)", a: "      otra.hidden = p.modo !== 'maestro'" },
    { nombre: 'bloqueado: las teclas siguen andando', de: '      if (p.bloqueadoHasta && cuentaRegresiva(p.bloqueadoHasta)) return\n', a: '' },

    // ── Los intentos ───────────────────────────────────────────────────────
    { nombre: 'un intento en singular dice "intentos"', de: "      if (n === 1) return 'PIN incorrecto · te queda 1 intento'\n", a: '' },
    { nombre: 'cero intentos dice "te quedan 0 intentos"', de: "      if (typeof n === 'number' && n > 1) return `PIN incorrecto · te quedan ${n} intentos`", a: "      if (typeof n === 'number' && n >= 0) return `PIN incorrecto · te quedan ${n} intentos`" },
    { nombre: 'el mensaje del PIN nombra a la persona', de: "      if (n === 1) return 'PIN incorrecto · te queda 1 intento'", a: "      if (n === 1) return 'Federico: PIN incorrecto · te queda 1 intento'" },

    // ── El PIN no queda en ningún lado ─────────────────────────────────────
    { nombre: 'el PIN se guarda en sessionStorage', de: '      p.enviando = false\n      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      // ESTE ES EL ÚNICO CAMINO', a: "      p.enviando = false\n      guardarSesion('produccion.ultimo-pin', p.digitos)\n      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      // ESTE ES EL ÚNICO CAMINO" },
    { nombre: 'los puntos muestran el número tipeado', de: '        const clase = i < puestos ? \' pr-pin__punto--lleno\' : (mal ? \' pr-pin__punto--mal\' : \'\')\n        out += `<span class="pr-pin__punto${clase}"></span>`', a: '        const clase = i < puestos ? \' pr-pin__punto--lleno\' : (mal ? \' pr-pin__punto--mal\' : \'\')\n        out += `<span class="pr-pin__punto${clase}">${estado.pin?.digitos[i] ?? \'\'}</span>`' },
    { nombre: 'el PIN maestro se guarda en sessionStorage', de: '      pinMaestro = p.digitos        // EN MEMORIA: otorgar_puesto_temporal lo pide', a: "      pinMaestro = p.digitos\n      guardarSesion('produccion.maestro-pin', p.digitos)" },
    { nombre: 'el PIN temporal queda en el estado después de cerrar', de: "      document.getElementById('pr-acceso-pin').hidden = true\n      estado.acceso = null\n      return siguientePaso()", a: "      document.getElementById('pr-acceso-pin').hidden = true\n      return siguientePaso()" },
    { nombre: 'el PIN temporal queda escrito en la pantalla', de: "      document.getElementById('pr-acceso-pin-numero').textContent = ''\n      document.getElementById('pr-acceso-pin').hidden = true\n      estado.acceso = null", a: "      document.getElementById('pr-acceso-pin').hidden = true\n      estado.acceso = null" },

    // ── El teclado ─────────────────────────────────────────────────────────
    { nombre: 'se puede tipear más largo que el PIN', de: '      else if (/^[0-9]$/.test(t) && p.digitos.length < p.largo) p.digitos += t', a: '      else if (/^[0-9]$/.test(t)) p.digitos += t' },
    { nombre: 'Borrar no borra', de: "      if (t === 'borrar') p.digitos = p.digitos.slice(0, -1)", a: "      if (t === 'borrar') p.digitos = p.digitos" },
    { nombre: 'el PIN maestro pide 4 números', de: "        largo: modo === 'maestro' ? LARGO_PIN_MAESTRO : LARGO_PIN,", a: '        largo: LARGO_PIN,' },
    { nombre: 'un PIN incompleto se manda igual', de: '      if (p.digitos.length !== p.largo) {', a: '      if (false) {' },
    { nombre: 'la tecla de acción no cambia en el primer paso', de: "${p.fase === 'nuevo' ? 'Seguir' : 'Entrar'}", a: 'Entrar' },

    // ── Verificar el PIN ───────────────────────────────────────────────────
    { nombre: 'verificar_pin_produccion sin el puesto', de: '          p_puesto: p.puesto, p_pin: p.digitos,', a: '          p_puesto: null, p_pin: p.digitos,' },
    { nombre: 'verificar_pin_produccion sin la unidad', de: '          p_empleado_id: p.personaId, p_unidad_negocio_id: estado.unidadId,\n          p_puesto: p.puesto, p_pin: p.digitos,', a: '          p_empleado_id: p.personaId, p_unidad_negocio_id: null,\n          p_puesto: p.puesto, p_pin: p.digitos,' },
    { nombre: 'un rechazo se lee como éxito', de: '      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      // ESTE ES EL ÚNICO CAMINO', a: '      if (false) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      // ESTE ES EL ÚNICO CAMINO' },
    { nombre: 'un rechazo no borra lo tipeado', de: "      p.mal = true\n      p.digitos = ''\n    }", a: '      p.mal = true\n    }' },
    { nombre: 'sin red se traga el error', de: "        p.mensaje = { texto: 'No se pudo verificar el PIN. Revisá la conexión y probá de nuevo.' }\n        p.digitos = ''\n        return pintarPin()\n      }\n      p.enviando = false\n      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      // ESTE ES EL ÚNICO CAMINO", a: "        p.digitos = ''\n        return pintarPin()\n      }\n      p.enviando = false\n      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      // ESTE ES EL ÚNICO CAMINO" },

    // ── EL CAMBIO OBLIGATORIO, que no se puede saltear ─────────────────────
    { nombre: 'debe_cambiar se saltea y entra igual', de: '      if (res.debe_cambiar) {', a: '      if (false) {' },
    { nombre: 'no se guarda el PIN actual para cambiarlo', de: '        p.pinActual = p.digitos\n', a: '' },
    { nombre: 'el repetido no se compara', de: '        if (p.digitos !== p.pinNuevo) {', a: '        if (false) {' },
    { nombre: 'repetir mal igual llama a la base', de: "          p.mensaje = { texto: 'Los dos no coinciden. Empezá de nuevo.' }\n          return pintarPin()", a: "          p.mensaje = { texto: 'Los dos no coinciden. Empezá de nuevo.' }" },
    { nombre: 'el primer paso guarda el PIN nuevo y entra', de: "      if (p.fase === 'nuevo') {\n        p.pinNuevo = p.digitos\n        p.fase = 'repetir'", a: "      if (p.fase === 'nuevo') {\n        p.pinNuevo = p.digitos\n        p.fase = 'pin'" },
    { nombre: 'cambiar_pin_produccion sin el PIN actual', de: '          p_pin_actual: p.pinActual, p_pin_nuevo: p.pinNuevo,', a: '          p_pin_actual: null, p_pin_nuevo: p.pinNuevo,' },
    { nombre: 'un cambio rechazado entra igual', de: '      p.enviando = false\n      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        p.pinNuevo = null', a: '      p.enviando = false\n      if (false) {\n        aplicarRechazoPin(res)\n        p.pinNuevo = null' },
    { nombre: 'el PIN nuevo inválido se tapa con un genérico', de: "        p.mensaje = { texto: err?.message || 'No se pudo cambiar el PIN. Probá de nuevo.' }", a: "        p.mensaje = { texto: 'No se pudo cambiar el PIN. Probá de nuevo.' }" },
    { nombre: 'pin_repetido manda a poner el PIN viejo otra vez', de: "        p.fase = res?.motivo === 'pin_repetido' ? 'nuevo' : 'pin'", a: "        p.fase = 'pin'" },
    { nombre: 'la barra de progreso no marca el segundo tramo', de: "      const dos = fase === 'repetir'", a: '      const dos = false' },
    { nombre: 'la barra de progreso sale siempre', de: "      if (fase !== 'nuevo' && fase !== 'repetir') return ''\n", a: '' },

    // ── El acceso maestro ──────────────────────────────────────────────────
    { nombre: 'el maestro se verifica contra el PIN común', de: "        const { data, error } = await supabase.rpc('verificar_pin_maestro', { p_empleado_id: p.personaId, p_pin: p.digitos })", a: "        const { data, error } = await supabase.rpc('verificar_pin_produccion', { p_empleado_id: p.personaId, p_pin: p.digitos })" },
    { nombre: 'con varios maestros se elige uno cualquiera', de: '        if (candidatos.length !== 1) {', a: '        if (candidatos.length === 0) {' },
    { nombre: 'un maestro rechazado queda activo igual', de: '      p.enviando = false\n      if (!res || res.ok !== true) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      estado.maestro =', a: '      p.enviando = false\n      if (false) {\n        aplicarRechazoPin(res)\n        return pintarPin()\n      }\n      estado.maestro =' },
    { nombre: 'el maestro no guarda su PIN en memoria', de: '      pinMaestro = p.digitos        // EN MEMORIA: otorgar_puesto_temporal lo pide\n', a: '' },
    { nombre: 'lo que hace el maestro no queda a su nombre', de: '      return entrar({ id: estado.maestro.id, nombre: estado.maestro.nombre, puesto: PUESTO_DE_MODO[modo] })', a: '      return entrar({ id: estado.maestro.id, nombre: estado.maestro.nombre, puesto: null })' },
    { nombre: 'con el maestro activo igual se pide el PIN', de: '      if (estado.maestro) return entrarComoMaestro(modo)\n', a: '' },
    { nombre: 'cerrar el maestro le deja el PIN en memoria', de: '      estado.maestro = null\n      pinMaestro = null', a: '      estado.maestro = null' },
    { nombre: 'cerrar el maestro deja a la persona adentro', de: '      estado.acceso = null\n      olvidarPersona()\n    }', a: '      estado.acceso = null\n    }' },
    { nombre: 'el cartel del maestro no dice a nombre de quién queda', de: '        `Acceso maestro · ${estado.maestro.nombre} · todo lo que hagas queda a tu nombre`', a: '        `Acceso maestro`' },
    { nombre: 'el panel del maestro no se marca como tal', de: "      panel.className = 'pr-tarjeta pr-pin' + (p.modo === 'maestro' ? ' pr-pin--maestro' : '')", a: "      panel.className = 'pr-tarjeta pr-pin'" },

    // ── Dar acceso por hoy ─────────────────────────────────────────────────
    { nombre: 'hasta hoy se manda una fecha en vez de null', de: '      if (!fecha || fecha === hoy) return null', a: '      if (!fecha) return null' },
    { nombre: 'el vencimiento se manda sin el huso de Argentina', de: "      return `${sumarDias(fecha, 1)}T00:00:00-03:00`", a: '      return `${sumarDias(fecha, 1)}T00:00:00Z`' },
    { nombre: 'se puede dar acceso sin elegir a quién', de: "      if (!a?.personaId) faltan.push('elegí a quién')\n", a: '' },
    { nombre: 'se puede dar acceso sin puesto', de: "      if (!a?.puesto) faltan.push('elegí el puesto')\n", a: '' },
    { nombre: 'una fecha que ya pasó se manda igual', de: "      if (a?.hasta && a.hasta < hoy) faltan.push('la fecha ya pasó')\n", a: '' },
    { nombre: 'más de 7 días se manda igual', de: "      if (a?.hasta && a.hasta > sumarDias(hoy, 6)) faltan.push('como mucho dura 7 días')\n", a: '' },
    { nombre: 'otorgar_puesto_temporal sin el maestro', de: '          p_maestro_id: estado.maestro?.id ?? null, p_maestro_pin: pinMaestro,', a: '          p_maestro_id: null, p_maestro_pin: null,' },
    { nombre: 'otorgar_puesto_temporal sin la unidad', de: '          p_empleado_id: a.personaId, p_unidad_negocio_id: estado.unidadId, p_puesto: a.puesto,', a: '          p_empleado_id: a.personaId, p_unidad_negocio_id: null, p_puesto: a.puesto,' },
    { nombre: 'un rechazo del maestro se lee como éxito', de: '      if (!res || res.ok !== true) {\n        // Si el maestro dejó de valer', a: '      if (false) {\n        // Si el maestro dejó de valer' },
    { nombre: 'el PIN temporal no se muestra', de: '      if (res.pin_temporal) {', a: '      if (false) {' },
    { nombre: 'un pin_temporal null se muestra igual', de: '      if (res.pin_temporal) {', a: '      if (true) {' },
    { nombre: 'no se dice que el PIN no se vuelve a mostrar', de: '          `Anotalo y pasáselo a ${nombre}. No se va a volver a mostrar.`', a: '          `Listo.`' },
    // Anclado a faltanParaAcceso() y no a `btn.disabled = …`, que no es único
    // en el archivo: el guard del runner lo cortaba antes de correr.
    { nombre: 'el botón se destraba sin elegir nada', de: '      return faltan\n    }\n\n    function abrirDarAcceso() {', a: '      return []\n    }\n\n    function abrirDarAcceso() {' },
  ],
})
