// Mutaciones de test-produccion-quien.js (barra de modos y "¿Quién sos?" del
// rediseño). Ver mutar.js.
//
//   node pruebas/mut-produccion-quien.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-quien.js'),
  escape: 'esc',
  funciones: ['htmlBotonPersona', 'htmlAvisoPuestos', 'htmlQuienEnBarra', 'htmlBarraModos'],
  equivalentes: [
    { expr: 'esc(PLURAL_PUESTO[puesto] ?? puesto)', motivo: 'PLURAL_PUESTO y el puesto salen de constantes del código (PUESTO_DE_MODO): ninguna salida posible tiene un carácter escapable' },
    { expr: "esc(ROL_DE_MODO[estado.modo] ?? '')", motivo: 'ROL_DE_MODO son dos literales del código ("Encargado" / "Masero") y el modo está validado contra PUESTO_DE_MODO: ninguna salida posible tiene un carácter escapable' },
  ],
  manuales: [
    // ── La regla de los puestos, que es la de la base ──────────────────────
    { nombre: 'el puesto temporal no cuenta', de: '      return fijos.includes(puesto) || temps.includes(puesto)', a: '      return fijos.includes(puesto)' },
    { nombre: 'el fijo también se marca como "hoy"', de: '      return !fijos.includes(puesto) && temps.includes(puesto)', a: '      return temps.includes(puesto)' },
    { nombre: 'lo que restringe pasa a ser el puesto temporal', de: '      const restringe = lista.some(p => Array.isArray(p.puestos) && p.puestos.includes(puesto))', a: '      const restringe = lista.some(p => tienePuesto(p, puesto))' },
    { nombre: 'no filtra por puesto', de: '      return { personas: lista.filter(p => tienePuesto(p, puesto)), sinConfigurar: false }', a: '      return { personas: lista, sinConfigurar: false }' },
    { nombre: 'sin puestos no muestra a nadie', de: '      if (!restringe) return { personas: lista, sinConfigurar: true }', a: '      if (!restringe) return { personas: [], sinConfigurar: true }' },
    { nombre: 'el modo masa pide encargados', de: "const PUESTO_DE_MODO = { produccion: 'encargado', masa: 'masero' }", a: "const PUESTO_DE_MODO = { produccion: 'encargado', masa: 'encargado' }" },
    { nombre: 'el aviso sale siempre', de: "      if (!sinConfigurar) return ''\n", a: '' },

    // ── El buscador ────────────────────────────────────────────────────────
    // Muta el normalizador COMPARTIDO, no una sola punta: normalizar solo la
    // búsqueda y no los nombres (o al revés) deja el caso "agustin" andando
    // igual, y la mutación se escapaba sin que faltara cobertura.
    { nombre: 'el buscador no ignora acentos', de: "      return String(t ?? '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase()", a: "      return String(t ?? '').toLowerCase()" },
    { nombre: 'el buscador no filtra nada', de: '      return personas.filter(p => normalizarBusqueda(p.nombre).includes(q))', a: '      return personas' },

    // ── La barra de modos ──────────────────────────────────────────────────
    { nombre: 'SALA DE MASA se deshabilita sin haberlo medido', de: '      return estado.abiertasConocido === true && estado.hayTurnoAbierto === false', a: '      return estado.hayTurnoAbierto === false' },
    { nombre: 'SALA DE MASA nunca se deshabilita', de: '      return estado.abiertasConocido === true && estado.hayTurnoAbierto === false', a: '      return false' },
    { nombre: 'el botón deshabilitado no lleva disabled', de: "${off ? ' disabled' : ''}>", a: '>' },
    { nombre: 'sin la leyenda de por qué está apagada', de: "`SALA DE MASA${off ? '<span class=\"pr-modo__nota\">· El encargado tiene que abrir el turno</span>' : ''}</button>`", a: '`SALA DE MASA</button>`' },
    { nombre: 'el modo activo no se marca', de: `aria-pressed="\${estado.modo === 'produccion' ? 'true' : 'false'}"`, a: 'aria-pressed="false"' },
    { nombre: 'sin nadie adentro igual aparece Salir', de: '      if (!estado.persona) {\n', a: '      if (false) {\n' },
    { nombre: 'el rol no sale del modo', de: '${esc(ROL_DE_MODO[estado.modo] ?? \'\')}:', a: 'Persona:' },
    { nombre: 'marcarAbiertas no marca el dato como conocido', de: '      estado.abiertasConocido = true\n', a: '' },
    { nombre: 'el fondo del body no cambia con el modo', de: "      cl.toggle('pr-modo-produccion', modo === 'produccion')", a: "      cl.toggle('pr-modo-produccion', false)" },
    // (25/09/2026) Las pantallas de oficina se fueron a la gestión: en la
    // planta lo que esconde la barra es no tener fábrica.
    { nombre: 'la barra se ve sin fábrica', de: '      return tieneTarea(\'cargar\') && !!estado.unidadId && !!estado.modo && !VISTAS_OFICINA.includes(estado.vista)', a: '      return tieneTarea(\'cargar\') && !!estado.modo && !VISTAS_OFICINA.includes(estado.vista)' },

    // ── Tocar un modo ──────────────────────────────────────────────────────
    { nombre: 'tocar SALA DE MASA deshabilitada igual cambia el modo', de: "      if (modo === 'masa' && salaDeshabilitada()) return\n", a: '' },
    // Terminar la tablet, parte 2: cambiar de modo ya no borra a nadie guardado, pero el modo NUEVO arranca sin nadie adentro hasta el PIN.
    { nombre: 'cambiar de modo conserva a la persona', de: '      estado.persona = null\n      estado.pin = null\n      estado.quienOtra = false\n      // Con el acceso maestro activo', a: '      estado.pin = null\n      estado.quienOtra = false\n      // Con el acceso maestro activo' },
    { nombre: 'un modo inválido se elige', de: '      if (!Object.prototype.hasOwnProperty.call(PUESTO_DE_MODO, modo)) return\n      tocar()', a: '      tocar()' },
    { nombre: 'tocar el modo activo vuelve a pedir el PIN', de: '      if (estado.modo === modo && estado.persona) return\n', a: '' },
    { nombre: 'no guarda el modo', de: '      estado.modo = modo\n      guardarPreferencia(CLAVE_MODO, modo)\n      // Cambiar de modo NO borra a nadie', a: '      estado.modo = modo\n      // Cambiar de modo NO borra a nadie' },

    // ── Qué se recuerda y qué no ───────────────────────────────────────────
    { nombre: 'el modo guardado acepta cualquier cosa', de: "      return Object.prototype.hasOwnProperty.call(PUESTO_DE_MODO, m ?? '') ? m : null", a: '      return m' },
    // (25/09/2026) Las de elegir fábrica se fueron con la pantalla: la tablet
    // trae SU fábrica de la cuenta del dispositivo.
    { nombre: 'sin fábrica se pregunta en vez de decirlo', de: '      if (!estado.unidadId) return mostrarSinFabrica()', a: '      if (!estado.unidadId) return mostrarQuien()' },
    { nombre: 'sin modo guardado no arranca en ningún modo', de: "      if (!estado.modo) estado.modo = 'produccion'\n", a: '' },
    { nombre: 'la persona guardada vale para cualquier puesto', de: '        if (p.puesto !== PUESTO_DE_MODO[modo]) return null\n', a: '' },
    { nombre: 'la persona guardada no se valida', de: "        if (!p || typeof p.id !== 'string' || typeof p.nombre !== 'string') return null\n", a: '' },
    { nombre: 'personaGuardada sin try: un sessionStorage corrupto rompe', de: '      try {\n        const p = JSON.parse(leerSesion(clavePersona(modo)) ?? \'null\')', a: '      {\n        const p = JSON.parse(leerSesion(clavePersona(modo)) ?? \'null\')' },
    { nombre: 'entrar no guarda a la persona en sessionStorage', de: '      if (!esMaestro) guardarSesion(clavePersona(estado.modo), JSON.stringify(estado.persona))\n', a: '' },
    { nombre: 'entrar la guarda en localStorage', de: '      if (!esMaestro) guardarSesion(clavePersona(estado.modo), JSON.stringify(estado.persona))', a: '      if (!esMaestro) guardarPreferencia(clavePersona(estado.modo), JSON.stringify(estado.persona))' },
    { nombre: 'Salir no borra a la persona', de: '      if (Object.prototype.hasOwnProperty.call(PUESTO_DE_MODO, modo ?? \'\')) guardarSesion(clavePersona(modo), null)\n      if (modo === estado.modo) {\n        estado.persona = null\n        estado.pin = null', a: '      if (modo === estado.modo) {\n        estado.pin = null' },
    { nombre: 'leer preferencia sin try', de: '      try { return localStorage.getItem(clave) } catch { return null }', a: '      return localStorage.getItem(clave)' },
    { nombre: 'leer sesión sin try', de: '      try { return sessionStorage.getItem(clave) } catch { return null }', a: '      return sessionStorage.getItem(clave)' },
    { nombre: 'guardar en sesión sin try', de: '      try {\n        if (valor == null) sessionStorage.removeItem(clave)\n        else sessionStorage.setItem(clave, valor)\n      } catch { /* sin memoria: se vuelve a preguntar al recargar */ }', a: '        if (valor == null) sessionStorage.removeItem(clave)\n        else sessionStorage.setItem(clave, valor)' },

    // ── Elegir un nombre NO entra ──────────────────────────────────────────
    { nombre: 'elegir un nombre entra sin PIN', de: "      estado.pin = nuevoPanelPin('persona', p, PUESTO_DE_MODO[estado.modo])", a: "      return entrar({ id: p.id, nombre: p.nombre, puesto: PUESTO_DE_MODO[estado.modo] })" },
    { nombre: 'un id que no está igual abre el PIN', de: '      if (!p) return\n      tocar()', a: '      tocar()' },
    { nombre: 'el nombre elegido no se marca', de: '      const elegida = estado.pin?.personaId ?? null', a: '      const elegida = null' },
    { nombre: 'personal_produccion sin la unidad', de: "      pintarPin()\n      try {\n        const { data, error } = await supabase.rpc('personal_produccion', { p_unidad_negocio_id: estado.unidadId })", a: "      pintarPin()\n      try {\n        const { data, error } = await supabase.rpc('personal_produccion', { p_unidad_negocio_id: null })" },
    { nombre: 'si falla deja la lista de antes', de: '        lista.innerHTML = \'<button type="button" class="pr-btn" id="pr-quien-reintentar">Reintentar</button>\'', a: '' },
    { nombre: 'sin coincidencias dice que no hay personal', de: "          ? '<p class=\"pr-texto-suave\">Ningún nombre coincide con lo que buscaste.</p>'", a: "          ? '<p class=\"pr-texto-suave\">No hay personal activo para elegir.</p>'" },

    // ── El cierre por inactividad ──────────────────────────────────────────
    { nombre: 'el corte pasa a ser de 60 minutos', de: '    const MINUTOS_INACTIVIDAD = 15', a: '    const MINUTOS_INACTIVIDAD = 60' },
    { nombre: 'Sala de masa también se cierra sola', de: "      const habiaPersona = estado.modo === 'produccion' && !!estado.persona", a: '      const habiaPersona = !!estado.persona' },
    { nombre: 'Producción no se cierra sola', de: "      const habiaPersona = estado.modo === 'produccion' && !!estado.persona", a: '      const habiaPersona = false' },
    { nombre: 'el maestro no se cierra solo', de: '      if (habiaMaestro) cerrarMaestro()\n', a: '' },
    { nombre: 'sin ningún toque registrado igual vence', de: "      return typeof desde === 'number' && (ahora - desde) >= MINUTOS_INACTIVIDAD * 60000", a: '      return (ahora - desde) >= MINUTOS_INACTIVIDAD * 60000' },

    // ── Lo que lee la base ─────────────────────────────────────────────────
    { nombre: 'leerHayAbiertas no filtra por abierto', de: ".select('id').eq('estado', 'abierto').in('maquina_id', ids)", a: ".select('id').in('maquina_id', ids)" },
  ],
})
