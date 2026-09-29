// Mutaciones de test-produccion-sesion.js ("terminar la tablet", parte 2). Ver mutar.js.
//
//   node pruebas/mut-produccion-sesion.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-sesion.js'),
  escape: 'esc',
  funciones: ['htmlMaseroAdentro', 'htmlLatPersona'],
  equivalentes: [
    { expr: 'esc(TITULO_DE_MODO[modo])', motivo: 'TITULO_DE_MODO es una constante del código ("Producción" / "Sala de masa"): sin esc() sale idéntico' },
    { expr: 'esc(NOMBRE_MODO[modo])', motivo: 'NOMBRE_MODO es una constante del código ("PRODUCCIÓN" / "SALA DE MASA"): sin esc() sale idéntico' },
    { expr: 'esc(puestoEnLateral())', motivo: 'puestoEnLateral() devuelve un literal del código ("Acceso maestro" o ROL_DE_MODO): sin esc() sale idéntico' },
  ],
  manuales: [
    // a) Una persona por modo.
    { nombre: 'cambiar de modo borra a las dos (el bug del 24/09)', de: "      estado.quienOtra = false\n      // Con el acceso maestro activo se entra sin volver a poner el PIN, y\n      // todo lo que se haga queda a nombre del maestro.\n      if (estado.maestro) return entrarComoMaestro(modo)", a: "      estado.quienOtra = false\n      olvidarTodas()\n      if (estado.maestro) return entrarComoMaestro(modo)" },
    { nombre: 'una sola clave para los dos modos', de: '      return `${CLAVE_PERSONA}.${modo}`', a: '      return CLAVE_PERSONA' },
    { nombre: 'Salir saca a las dos', de: '      olvidarPersona(estado.modo)\n      estado.volverA = null\n      estado.quienOtra = false\n      if (estado.modo', a: "      olvidarPersona(estado.modo)\n      guardarSesion(clavePersona(OTRO_MODO[estado.modo]), null)\n      estado.volverA = null\n      estado.quienOtra = false\n      if (estado.modo" },
    // b) Con persona guardada, solo el PIN.
    { nombre: 'la persona guardada se ignora (vuelve la lista)', de: '      const guardada = estado.quienOtra ? null : personaGuardada(estado.modo)', a: '      const guardada = null' },
    { nombre: 'con persona guardada no se abre su PIN', de: "        estado.pin = nuevoPanelPin('persona', guardada, PUESTO_DE_MODO[estado.modo])\n", a: '' },
    // Planta v2: con persona guardada la grilla NO se esconde (queda elegida
    // y la ventana del PIN se abre sola); la ✕ de la ventana es "Soy otra persona".
    { nombre: 'la ✕ con persona guardada no dice "Soy otra persona"', de: "(estado.quienFija ? 'Soy otra persona' : 'Elegir otra persona')", a: "'Elegir otra persona'" },
    { nombre: 'la ✕ con persona guardada no la suelta', de: '      if (estado.quienFija) return soyOtraPersona()\n', a: '' },
    { nombre: 'la persona guardada no queda marcada en la grilla', de: '      const elegida = estado.pin?.personaId ?? null', a: '      const elegida = null' },
    { nombre: '"Soy otra persona" no suelta a la guardada', de: '      tocar()\n      estado.quienOtra = true\n      return mostrarQuien()', a: '      tocar()\n      return mostrarQuien()' },
    { nombre: 'el nombre fijo (saludo del PIN) por innerHTML', de: "      document.getElementById('pr-pin-saludo').textContent = saludoPin(p)", a: "      document.getElementById('pr-pin-saludo').innerHTML = saludoPin(p)" },
    // Inactividad.
    // (28/09/2026) Decisión de Facu: Producción deja a la persona ELEGIDA, y
    // en Sala de masa no se toca nada.
    { nombre: 'la inactividad en Producción olvida al encargado guardado', de: '      estado.volverA = null\n      estado.persona = null\n      estado.pin = null\n      estado.quienOtra = false\n      // mostrarQuien trae', a: "      estado.volverA = null\n      olvidarPersona('produccion')\n      estado.pin = null\n      estado.quienOtra = false\n      // mostrarQuien trae" },
    { nombre: 'la inactividad en Producción también saca al masero', de: '      estado.volverA = null\n      estado.persona = null\n      estado.pin = null\n      estado.quienOtra = false\n      // mostrarQuien trae', a: "      estado.volverA = null\n      guardarSesion(clavePersona('masa'), null)\n      estado.persona = null\n      estado.pin = null\n      estado.quienOtra = false\n      // mostrarQuien trae" },
    { nombre: 'la inactividad en Sala de masa olvida al encargado guardado', de: "        if (!estado.maestro) return false\n        tocar()", a: "        guardarSesion(clavePersona('produccion'), null)\n        if (!estado.maestro) return false\n        tocar()" },
    { nombre: 'la inactividad en Sala de masa saca al masero', de: "      if (estado.modo === 'masa') {\n        if (!estado.maestro) return false", a: "      if (estado.modo === 'masa') {\n        estado.persona = null\n        if (!estado.maestro) return false" },
    // c) Sacar al masero.
    { nombre: 'cualquiera puede sacar al masero', de: "      return !!estado.maestro || (estado.modo === 'produccion' && !!estado.persona)", a: '      return true' },
    { nombre: 'el maestro no puede sacarlo', de: "      return !!estado.maestro || (estado.modo === 'produccion' && !!estado.persona)", a: "      return estado.modo === 'produccion' && !!estado.persona" },
    { nombre: 'sacar no borra', de: "      olvidarPersona('masa')\n      pintarMaseroAdentro()", a: '      pintarMaseroAdentro()' },
    { nombre: 'el tablero no lo pinta', de: '      marcarAbiertas(estado.tablero.some(e => e.turno))\n      pintarMaseroAdentro()\n', a: '      marcarAbiertas(estado.tablero.some(e => e.turno))\n' },
    // d) Cerrar la planilla.
    { nombre: 'sin abiertas el masero no sale', de: '      if (hay === false) sacarMaseroPorCierre()\n', a: '' },
    { nombre: 'apagar la sala saca también al maestro', de: " && estado.persona.id !== estado.maestro?.id) {", a: ') {' },
    { nombre: 'la máquina cerrada sigue en la sala', de: '        if (e.turno && e.turno.id === turnoId) e.turno = null\n', a: '' },
    { nombre: 'la elegida no se suelta', de: '      if (estado.salaTurno && estado.salaTurno.id === turnoId) soltarMaquinaSala()\n      // LA MÁQUINA CERRADA', a: '      // LA MÁQUINA CERRADA' },
    { nombre: 'no se vuelve a medir', de: '      await refrescarAbiertas()\n      pintarLateral()\n    }', a: '      pintarLateral()\n    }' },
    { nombre: 'sin medir se apaga igual (rompe el tercer estado)', de: '      await refrescarAbiertas()\n      pintarLateral()\n    }', a: '      marcarAbiertas((estado.tablero ?? []).some(e => e.turno))\n      pintarLateral()\n    }' },
    { nombre: 'cerrar_turno no avisa a la sala', de: "        mostrarExito('Planilla cerrada.')\n        await maquinaCerrada(turnoId)", a: "        mostrarExito('Planilla cerrada.')" },
    { nombre: 'forzar_cierre_turno no avisa a la sala', de: '        await maquinaCerrada(p.turno.id)\n', a: '' },
    // e) Una sola máquina.
    { nombre: 'una sola abierta no entra derecho', de: '      if (abiertas.length === 1 && !estado.salaTurno) await elegirMaquinaSala(abiertas[0].turno.id)\n', a: '' },
    { nombre: 'con dos también entra derecho', de: '      if (abiertas.length === 1 && !estado.salaTurno)', a: '      if (abiertas.length >= 1 && !estado.salaTurno)' },
    // f) Nunca muda.
    { nombre: 'sin reintento', de: '        if (!tablero.some(e => e.turno) && barraDiceQueHay) {', a: '        if (false) {' },
    { nombre: 'reintenta siempre (sin mirar la barra)', de: '        if (!tablero.some(e => e.turno) && barraDiceQueHay) {', a: '        if (!tablero.some(e => e.turno)) {' },
    { nombre: 'la contradicción apaga la sala', de: '            if (hay !== false) {', a: '            if (hay === null) {' },
    { nombre: 'sin turno: el pedido viejo pisa', de: '        tablero = estadoMaquinas(await leerTablero(estado.unidadId))\n        if (turno !== estado.salaPedido) return\n        if (!tablero', a: '        tablero = estadoMaquinas(await leerTablero(estado.unidadId))\n        if (!tablero' },
    { nombre: 'el aviso de siempre sin reintentar', de: "el encargado tiene que abrir el turno. ' + AVISO_SALA_REINTENTAR + '</div>'", a: "el encargado tiene que abrir el turno.</div>'" },
    { nombre: 'el error sin reintentar', de: "Revisá la conexión. ' + AVISO_SALA_REINTENTAR + '</div>'", a: "Revisá la conexión.</div>'" },
    { nombre: 'Volver a intentar no se escucha', de: "        if (ev.target.closest('#pr-sala-volver-intentar')) mostrarSala()", a: '        void ev' },
    // g) Sin nadie adentro: "¿Quién sos?" a pantalla completa, sin barra.
    { nombre: 'la barra se ve sin nadie adentro', de: '      return enModoTablet() && !!estado.persona && !PANTALLAS_SIN_BARRA', a: '      return enModoTablet() && !PANTALLAS_SIN_BARRA' },
    { nombre: 'la barra se ve en "¿Quién sos?"', de: "const PANTALLAS_SIN_BARRA = ['pr-quien', 'pr-inicio'", a: "const PANTALLAS_SIN_BARRA = ['pr-inicio'" },
    // h) Unidad.
    // (25/09/2026) Las de elegir y cambiar de fábrica se fueron: la tablet trae
    // SU fábrica (mi_sesion_produccion). La que queda: el arranque la toma de ahí.
    { nombre: 'el arranque no toma la fábrica de la cuenta', de: '      estado.unidadId = estado.unidadesPosibles[0]', a: '      estado.unidadId = null' },
    // El maestro.
    { nombre: 'el maestro se guarda y pisa al encargado', de: '      if (!esMaestro) guardarSesion(', a: '      if (true) guardarSesion(' },
  ],
})
