// Mutaciones de test-produccion-sesion.js ("terminar la tablet", parte 2). Ver mutar.js.
//
//   node pruebas/mut-produccion-sesion.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-sesion.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlMaseroAdentro', 'htmlQuienEnBarra'],
  equivalentes: [
    { expr: "esc(ROL_DE_MODO[estado.modo] ?? '')", motivo: 'ROL_DE_MODO es una constante del código ("Encargado" / "Masero"): sin esc() sale idéntico' },
  ],
  manuales: [
    // a) Una persona por modo.
    { nombre: 'cambiar de modo borra a las dos (el bug del 24/09)', de: "      estado.quienOtra = false\n      // Con el acceso maestro activo se entra sin volver a poner el PIN, y\n      // todo lo que se haga queda a nombre del maestro.\n      if (estado.maestro) return entrarComoMaestro(modo)", a: "      estado.quienOtra = false\n      olvidarTodas()\n      if (estado.maestro) return entrarComoMaestro(modo)" },
    { nombre: 'una sola clave para los dos modos', de: '      return `${CLAVE_PERSONA}.${modo}`', a: '      return CLAVE_PERSONA' },
    { nombre: 'Salir saca a las dos', de: '      olvidarPersona(estado.modo)\n      estado.quienOtra = false\n      return mostrarQuien()', a: '      olvidarTodas()\n      estado.quienOtra = false\n      return mostrarQuien()' },
    // b) Con persona guardada, solo el PIN.
    { nombre: 'la persona guardada se ignora (vuelve la lista)', de: '      const guardada = estado.quienOtra ? null : personaGuardada(estado.modo)', a: '      const guardada = null' },
    { nombre: 'con persona guardada no se abre su PIN', de: "        estado.pin = nuevoPanelPin('persona', guardada, PUESTO_DE_MODO[estado.modo])\n", a: '' },
    { nombre: 'la lista no se esconde', de: '        document.getElementById(id).hidden = !!f', a: '        document.getElementById(id).hidden = false' },
    { nombre: '"Soy otra persona" no suelta a la guardada', de: '      tocar()\n      estado.quienOtra = true\n      return mostrarQuien()', a: '      tocar()\n      return mostrarQuien()' },
    { nombre: 'el nombre fijo por innerHTML', de: "      document.getElementById('pr-quien-fija-texto').textContent = f ?", a: "      document.getElementById('pr-quien-fija-texto').innerHTML = f ?" },
    // Inactividad.
    { nombre: 'la inactividad no olvida al encargado guardado', de: "      tocar()\n      olvidarPersona('produccion')\n      if (habiaPersona) salir()", a: "      tocar()\n      if (habiaPersona) salir()" },
    { nombre: 'la inactividad también saca al masero', de: "      tocar()\n      olvidarPersona('produccion')\n      if (habiaPersona) salir()", a: "      tocar()\n      olvidarPersona('produccion')\n      olvidarPersona('masa')\n      if (habiaPersona) salir()" },
    // c) Sacar al masero.
    { nombre: 'cualquiera puede sacar al masero', de: "      return !!estado.maestro || (estado.modo === 'produccion' && !!estado.persona)", a: '      return true' },
    { nombre: 'el maestro no puede sacarlo', de: "      return !!estado.maestro || (estado.modo === 'produccion' && !!estado.persona)", a: "      return estado.modo === 'produccion' && !!estado.persona" },
    { nombre: 'sacar no borra', de: "      olvidarPersona('masa')\n      pintarMaseroAdentro()", a: '      pintarMaseroAdentro()' },
    { nombre: 'el tablero no lo pinta', de: '      marcarAbiertas(estado.tablero.some(e => e.turno))\n      pintarMaseroAdentro()\n', a: '      marcarAbiertas(estado.tablero.some(e => e.turno))\n' },
    // d) Cerrar la planilla.
    { nombre: 'sin abiertas el masero no sale', de: '      if (hay === false) sacarMaseroPorCierre()\n', a: '' },
    { nombre: 'apagar la sala saca también al maestro', de: " && estado.persona.id !== estado.maestro?.id) {", a: ') {' },
    { nombre: 'la máquina cerrada sigue en la sala', de: '        if (e.turno && e.turno.id === turnoId) e.turno = null\n', a: '' },
    { nombre: 'la elegida no se suelta', de: '      if (estado.salaTurno && estado.salaTurno.id === turnoId) soltarMaquinaSala()\n      await refrescarAbiertas()', a: '      await refrescarAbiertas()' },
    { nombre: 'no se vuelve a medir', de: '      if (estado.salaTurno && estado.salaTurno.id === turnoId) soltarMaquinaSala()\n      await refrescarAbiertas()', a: '      if (estado.salaTurno && estado.salaTurno.id === turnoId) soltarMaquinaSala()' },
    { nombre: 'sin medir se apaga igual (rompe el tercer estado)', de: '      if (estado.salaTurno && estado.salaTurno.id === turnoId) soltarMaquinaSala()\n      await refrescarAbiertas()', a: '      if (estado.salaTurno && estado.salaTurno.id === turnoId) soltarMaquinaSala()\n      marcarAbiertas((estado.tablero ?? []).some(e => e.turno))' },
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
    // g) Tocá para entrar.
    { nombre: 'vuelve "Nadie adentro"', de: '<button type="button" class="pr-barra__entrar" id="pr-btn-entrar">Tocá para entrar</button>', a: '<div class="pr-barra__nadie">Nadie adentro</div>' },
    { nombre: 'Tocá para entrar no abre nada', de: "        if (ev.target.closest('#pr-btn-entrar')) { tocar(); estado.quienOtra = false; mostrarQuien(); return }\n", a: '' },
    // h) Unidad.
    { nombre: 'una sola unidad se pregunta', de: '      if (estado.unidadesPosibles.length === 1) return elegirUnidad(estado.unidadesPosibles[0])\n', a: '' },
    { nombre: '"Cambiar de unidad" con una sola la borra', de: '        if (estado.unidadesPosibles.length < 2) return siguientePaso()\n', a: '' },
    { nombre: 'cambiar de fábrica deja a las personas', de: '      olvidarTodas()\n      guardarPreferencia(CLAVE_UNIDAD, id)', a: '      olvidarPersona()\n      guardarPreferencia(CLAVE_UNIDAD, id)' },
    // El maestro.
    { nombre: 'el maestro se guarda y pisa al encargado', de: '      if (!esMaestro) guardarSesion(', a: '      if (true) guardarSesion(' },
  ],
})
