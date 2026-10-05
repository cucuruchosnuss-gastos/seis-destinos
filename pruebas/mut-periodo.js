// Mutaciones del control de período (ver test-periodo.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-periodo.js'),
  original: path.join(__dirname, '..', 'js', 'periodo.js'),
  funciones: [],
  manuales: [
    // Los atajos.
    { nombre: 'la semana empieza el domingo', de: 'const atras = (dia + 6) % 7', a: 'const atras = dia' },
    { nombre: 'este mes empieza hoy', de: "if (clave === 'mes') return { desde: hoyIso.slice(0, 8) + '01', hasta: hoyIso }", a: "if (clave === 'mes') return { desde: hoyIso, hasta: hoyIso }" },
    { nombre: 'mes pasado termina el 30 siempre', de: 'const ultimo = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 0))', a: 'const ultimo = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 30))' },
    { nombre: 'mes pasado es este mes', de: 'const primero = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1))', a: 'const primero = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1))' },
    { nombre: 'todo pone fechas', de: "if (clave === 'todo') return { desde: '', hasta: '' }", a: "if (clave === 'todo') return { desde: '2000-01-01', hasta: hoyIso }" },
    { nombre: 'un atajo desconocido inventa hoy', de: "  if (clave === 'todo') return { desde: '', hasta: '' }\n  return null", a: "  if (clave === 'todo') return { desde: '', hasta: '' }\n  return { desde: hoyIso, hasta: hoyIso }" },
    { nombre: 'hoy en UTC', de: "new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_PERIODO,", a: "new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC'," },
    // El texto y la validación.
    { nombre: 'un rango a mano se lee como Todo', de: "  if (d) return 'Desde el ' + dmy(d)", a: "  if (d) return 'Todo'" },
    { nombre: 'el rango no dice el año', de: "return 'Del ' + (d.slice(0, 4) === h.slice(0, 4) ? dm(d) : dmy(d)) + ' al ' + dmy(h)", a: "return 'Del ' + dm(d) + ' al ' + dm(h)" },
    { nombre: 'acepta desde después de hasta', de: "if (desde && hasta && desde > hasta) return", a: "if (desde && hasta && desde > hasta && false) return" },
    { nombre: 'obligatorias no pide las dos', de: "  if (obligatorias && (!desde || !hasta)) return 'Elegí las dos fechas.'\n", a: '' },
    // Ubicar el panel.
    { nombre: 'el panel se abre siempre abajo', de: '  if (alto <= abajo || abajo >= arriba) {', a: '  if (true) {' },
    { nombre: 'no se recorta por la derecha', de: 'const left = Math.max(margen, Math.min(r.left, anchoVista - margen - ancho))', a: 'const left = Math.max(margen, r.left)' },
    { nombre: 'no se achica si no entra', de: "    if (alto > abajo) { panel.style.maxHeight = Math.max(abajo, 120) + 'px'; panel.style.overflowY = 'auto' }\n", a: '' },
    { nombre: 'sin tope de ancho', de: "  panel.style.maxWidth = anchoMax + 'px'\n", a: '' },
    // El control.
    { nombre: 'reemplaza los campos en vez de envolverlos', de: '  envD.parentNode.insertBefore(caja, envD)\n', a: '  envD.parentNode.insertBefore(caja, envD)\n  envD.parentNode.hijos && envD.parentNode.hijos.splice(envD.parentNode.hijos.indexOf(envD), 1)\n' },
    { nombre: 'no esconde los Desde/Hasta sueltos', de: '  envD.hidden = true\n  envH.hidden = true\n', a: '' },
    { nombre: 'no avisa con change', de: "    for (const c of cambios) c.dispatchEvent(new Event('change', { bubbles: true }))", a: '    void cambios' },
    { nombre: 'avisa aunque no cambie', de: "    if (desde.value !== d) { desde.value = d; cambios.push(desde) }", a: "    desde.value = d; cambios.push(desde)" },
    { nombre: 'no se entera de los cambios desde código', de: '  vigilarValor(desde, repintar)\n', a: '' },
    { nombre: 'Escape no cierra', de: "if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return }", a: "if (e.key === 'Escape') return" },
    { nombre: 'cerrar no devuelve el foco', de: '    if (devolverFoco && boton.isConnected) boton.focus()', a: '    void devolverFoco' },
    { nombre: 'un rango malo se aplica igual', de: "    if (msg) { error.textContent = msg; error.hidden = false; return }", a: '    void msg' },
    { nombre: 'obligatorias ofrece Todo', de: "ATAJOS_PERIODO.filter(a => !(obligatorias && a.clave === 'todo'))", a: 'ATAJOS_PERIODO.filter(a => true)' },
    { nombre: 'el panel no valida con obligatorias', de: '    const msg = errorDeRango(campoD.value, campoH.value, { obligatorias })', a: '    const msg = errorDeRango(campoD.value, campoH.value)' },
    { nombre: 'en el celular no es hoja', de: '  function esHoja() { return window.innerWidth < ANCHO_HOJA_PERIODO }', a: '  function esHoja() { return false }' },
    { nombre: 'el fondo no cierra', de: "  fondo.addEventListener('click', () => cerrar())\n", a: '' },
    { nombre: 'tocar afuera no cierra', de: '      if (!c.caja.contains(e.target)) c.cerrar({ devolverFoco: false })', a: '      void c' },
    { nombre: 'reabrir no carga las fechas', de: '    campoD.value = desde.value\n', a: '' },
    { nombre: 'el atajo no queda marcado', de: "b.setAttribute('aria-pressed', String(b.dataset.periodoAtajo === clave))", a: "b.setAttribute('aria-pressed', 'false')" },
    { nombre: 'no es idempotente', de: '  if (desde._periodo) return desde._periodo\n', a: '' },
    { nombre: 'no escapa el id', de: '<button type="button" class="periodo__boton" id="${escPer(base)}"', a: '<button type="button" class="periodo__boton" id="${base}"' },
    { nombre: 'escPer no escapa comillas', de: ".replace(/\"/g, '&quot;')", a: '' },
  ],
})
