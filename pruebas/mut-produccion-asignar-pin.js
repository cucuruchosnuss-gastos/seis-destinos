// Mutaciones de test-produccion-asignar-pin.js ("Asignar PIN" desde la
// planta con el acceso maestro). Ver mutar.js: de a una, con anclas únicas.
//
//   node pruebas/mut-produccion-asignar-pin.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-asignar-pin.js'),
  escape: 'esc',
  funciones: ['htmlPersonaAsignar'],
  equivalentes: [
    { expr: 'esc(estadoPinPlanta(p))', motivo: 'estadoPinPlanta devuelve uno de cuatro textos fijos del código (Sin PIN / PIN de un día / Pendiente de cambiar / PIN propio): ninguno tiene un carácter escapable' },
    { expr: 'esc(accion)', motivo: 'accion es "Asignar" o "Resetear", constantes del código: ningún carácter escapable' },
  ],
  manuales: [
    // ── Los estados del PIN ────────────────────────────────────────────────
    { nombre: 'el PIN de un día se lee como pendiente', de: "      if (p.pin_temporal) return 'PIN de un día'\n", a: '' },
    { nombre: 'pendiente de cambiar se lee como propio', de: "      if (p.debe_cambiar_pin) return 'Pendiente de cambiar'\n", a: '' },
    { nombre: 'con PIN el botón dice Asignar', de: "      const accion = p?.tiene_pin ? 'Resetear' : 'Asignar'", a: "      const accion = 'Asignar'" },

    // ── La lista ───────────────────────────────────────────────────────────
    { nombre: 'la lista trae a los de otra fábrica', de: "(Array.isArray(personal) ? personal : []).filter(p => p.misma_unidad === true)", a: "(Array.isArray(personal) ? personal : [])" },
    { nombre: 'el buscador no filtra', de: '      return personasFiltradas(lista, busqueda)\n    }\n\n    function htmlPersonaAsignar', a: '      return lista\n    }\n\n    function htmlPersonaAsignar' },
    { nombre: 'se puede elegir a alguien de otra fábrica', de: "      const p = personasParaAsignar(estado.personal ?? [], '').find(x => x.id === id)", a: "      const p = (estado.personal ?? []).find(x => x.id === id)" },
    { nombre: 'sin maestro igual se abre', de: '    function abrirAsignarPin() {\n      if (!estado.maestro) return\n', a: '    function abrirAsignarPin() {\n' },

    // ── El teclado ─────────────────────────────────────────────────────────
    { nombre: 'se puede tipear más de 4', de: '      else if (/^[0-9]$/.test(t) && a.digitos.length < LARGO_PIN) a.digitos += t', a: '      else if (/^[0-9]$/.test(t)) a.digitos += t' },
    { nombre: 'Borrar no borra', de: "      if (t === 'borrar') a.digitos = a.digitos.slice(0, -1)", a: "      if (t === 'borrar') a.digitos = a.digitos" },
    { nombre: 'mientras se manda el teclado sigue escribiendo', de: '      if (!a || !a.personaId || a.enviando) return\n      tocar()\n      a.error = null', a: '      if (!a || !a.personaId) return\n      tocar()\n      a.error = null' },
    { nombre: 'Volver desde el panel no borra lo tipeado', de: "        a.personaId = null\n        a.digitos = ''\n        a.error = null\n        return pintarAsignarPin()", a: "        a.personaId = null\n        a.error = null\n        return pintarAsignarPin()" },

    // ── Confirmar ──────────────────────────────────────────────────────────
    { nombre: 'con menos de 4 igual se manda', de: "      if (!new RegExp(`^[0-9]{${LARGO_PIN}}$`).test(a.digitos)) {", a: '      if (false) {' },
    { nombre: 'sin maestro igual se intenta', de: "      if (!estado.maestro) { a.error = 'El acceso maestro se cerró: volvé a entrar con tu PIN maestro.'; return pintarAsignarPin() }\n", a: '' },
    { nombre: 'p_maestro_pin no viaja', de: '          p_maestro_id: estado.maestro.id, p_maestro_pin: pinMaestro,', a: '          p_maestro_id: estado.maestro.id, p_maestro_pin: null,' },
    { nombre: 'p_maestro_id es la persona', de: '          p_maestro_id: estado.maestro.id, p_maestro_pin: pinMaestro,', a: '          p_maestro_id: personaId, p_maestro_pin: pinMaestro,' },
    { nombre: 'el botón no se traba mientras se manda', de: '      btn.disabled = !!a.enviando\n      btn.textContent = a.enviando ?', a: '      btn.disabled = false\n      btn.textContent = a.enviando ?' },
    { nombre: 'el botón se deshabilita por lo que falta', de: '      btn.disabled = !!a.enviando\n      btn.textContent = a.enviando ?', a: '      btn.disabled = !!a.enviando || (a.digitos ?? \'\').length < LARGO_PIN\n      btn.textContent = a.enviando ?' },
    { nombre: 'el error no se ve', de: '      err.hidden = !a.error\n      err.textContent = a.error ?? \'\'\n      if (!persona) {', a: '      err.hidden = true\n      err.textContent = a.error ?? \'\'\n      if (!persona) {' },
    { nombre: 'el rechazo del maestro se tapa con un genérico', de: '        a.error = mensajeDePin(res).texto\n        return pintarAsignarPin()', a: "        a.error = 'No se pudo.'\n        return pintarAsignarPin()" },
    { nombre: 'el error lanzado se tapa con un genérico', de: "        a.error = e?.message || 'No se pudo guardar el PIN. Probá de nuevo.'", a: "        a.error = 'No se pudo guardar el PIN. Probá de nuevo.'" },
    { nombre: 'un {ok:false} se toma como éxito', de: '      if (!res || res.ok !== true) {\n        // El PIN maestro dejó de valer (o se bloqueó)', a: '      if (!res) {\n        // El PIN maestro dejó de valer (o se bloqueó)' },
    { nombre: 'OK no borra los dígitos', de: "      a.digitos = ''\n      a.personaId = null\n      mostrarExito(", a: "      a.personaId = null\n      mostrarExito(" },
    { nombre: 'OK no dice el éxito', de: '      mostrarExito(`PIN guardado para ${nombre}. La primera vez que entre va a elegir uno propio.`)\n', a: '' },
    { nombre: 'OK no relee el personal', de: "        const { data, error } = await supabase.rpc('personal_produccion', { p_unidad_negocio_id: estado.unidadId })\n        if (error) throw error\n        estado.personal = personalSinPruebas(data)\n      } catch (err) {\n        console.error('personal_produccion (asignar PIN):', err)", a: "        const data = estado.personal\n      } catch (err) {\n        console.error('personal_produccion (asignar PIN):', err)" },

    // ── El PIN no queda en ningún lado ─────────────────────────────────────
    { nombre: 'los puntos muestran los números', de: "      document.getElementById('pr-asignar-puntos').innerHTML = htmlPuntosPin(LARGO_PIN, a.digitos.length, false)", a: "      document.getElementById('pr-asignar-puntos').innerHTML = htmlPuntosPin(LARGO_PIN, a.digitos.length, false) + a.digitos" },
    { nombre: 'el PIN nuevo se guarda en sessionStorage', de: "      else if (/^[0-9]$/.test(t) && a.digitos.length < LARGO_PIN) a.digitos += t\n      pintarAsignarPin()", a: "      else if (/^[0-9]$/.test(t) && a.digitos.length < LARGO_PIN) a.digitos += t\n      guardarSesion('produccion.asignar-pin', a.digitos)\n      pintarAsignarPin()" },
    { nombre: 'el PIN nuevo queda en un data-*', de: "      document.getElementById('pr-asignar-teclado').innerHTML = htmlTecladoAsignar(a.enviando)", a: "      document.getElementById('pr-asignar-teclado').innerHTML = htmlTecladoAsignar(a.enviando)\n      document.getElementById('pr-asignar-teclado').dataset.pin = a.digitos" },
    { nombre: 'cerrar el maestro no borra el PIN a medio tipear', de: '      estado.asignar = null   // el PIN nuevo a medio tipear también se va\n', a: '' },
    { nombre: 'irse de la pantalla no borra el PIN', de: "      if (id !== 'pr-asignar') estado.asignar = null\n", a: '' },
    { nombre: 'por inactividad la pantalla del maestro queda abierta', de: "      else if (habiaMaestro && (estado.vista === 'pr-asignar' || estado.vista === 'pr-acceso')) siguientePaso()\n", a: '' },
  ],
})
