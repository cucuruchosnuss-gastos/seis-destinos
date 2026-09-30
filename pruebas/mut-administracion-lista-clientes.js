// Mutaciones de test-administracion-lista-clientes.js ("Clientes de esta
// lista" en Administración → Listas de precios, 30/09/2026). Ver mutar.js
// (los tres guards: suite verde sobre el limpio, ancla única, mutación que
// cambia algo). Muta modulos/administracion.html, fuera de la región de Cheques.
//
//   node pruebas/mut-administracion-lista-clientes.js
'use strict'
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-lista-clientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: [],
  manuales: [
    // Qué se ofrece
    { nombre: 'se ofrecen también los apagados',
      de: '      return (estado.clientes ?? []).filter(c => c?.activo !== false)\n', a: '      return (estado.clientes ?? []).filter(c => true)\n' },
    { nombre: 'sin orden alfabético',
      de: "        .sort((a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es'))", a: '' },
    { nombre: 'el de la lista no viene tildado',
      de: "<input type=\"checkbox\"${tiene ? ' checked' : ''}", a: '<input type="checkbox"' },
    { nombre: 'no se dice que tiene otra lista',
      de: "otra ? `Hoy en la lista ${otra}: tildarlo lo pasa a esta` : 'Sin lista'", a: "'Sin lista'" },
    { nombre: 'el nombre del cliente sin escapar',
      de: '<span class="ad-lista-cliente__nombre">${esc(c.nombre)}</span>', a: '<span class="ad-lista-cliente__nombre">${c.nombre}</span>' },
    { nombre: 'el id sin escapar',
      de: 'data-lista-cliente="${esc(c.id)}"', a: 'data-lista-cliente="${c.id}"' },
    { nombre: 'la otra lista sin escapar',
      de: '<span class="ad-texto-suave">${esc(meta)}</span>', a: '<span class="ad-texto-suave">${meta}</span>' },
    // El resumen
    { nombre: 'la cuenta mira cualquier lista',
      de: '      const deLaLista = activos.filter(c => c.lista_precio_id === l.id)', a: '      const deLaLista = activos.filter(c => c.lista_precio_id)' },
    { nombre: 'la cuenta sin singular',
      de: "`${n} ${n === 1 ? 'cliente tiene' : 'clientes tienen'} esta lista.`", a: "`${n} clientes tienen esta lista.`" },
    { nombre: 'sin clientes dice "0" en vez de "Ningún"',
      de: "      const cuenta = n === 0 ? 'Ningún cliente tiene esta lista.' : ", a: '      const cuenta = ' },
    { nombre: 'no hay aviso de los sin lista',
      de: '      const avisoSinLista = m ? `', a: '      const avisoSinLista = false ? `' },
    { nombre: 'el aviso cuenta también los que tienen otra lista',
      de: '      const sinLista = activos.filter(c => !c.lista_precio_id)', a: '      const sinLista = activos.filter(c => c.lista_precio_id !== l.id)' },
    { nombre: 'el aviso no nombra a los clientes',
      de: '${esc(textoSinLista)} ${htmlNombresCortos(sinLista)}</div>', a: '${esc(textoSinLista)}</div>' },
    { nombre: 'los nombres del aviso sin escapar',
      de: "      return esc(nombres.join(', ') + (resto > 0 ? ` y ${resto} más` : '') + '.')", a: "      return nombres.join(', ') + (resto > 0 ? ` y ${resto} más` : '') + '.'" },
    { nombre: 'el texto del aviso sin escapar (la empresa)',
      de: '<div class="ad-aviso ad-aviso--grave">${esc(textoSinLista)}', a: '<div class="ad-aviso ad-aviso--grave">${textoSinLista}' },
    { nombre: 'sin clientes leídos se inventa un cero',
      de: '      if (estado.clientes === null) {\n        return l.error', a: '      if (false) {\n        return l.error' },
    // Guardar
    { nombre: 'tildar manda más que lista_precio_id',
      de: "p_datos: { lista_precio_id: tildado ? l.id : '' } })", a: "p_datos: { lista_precio_id: tildado ? l.id : '', activo: true } })" },
    { nombre: 'destildar manda null en vez de ""',
      de: "p_datos: { lista_precio_id: tildado ? l.id : '' } })", a: "p_datos: { lista_precio_id: tildado ? l.id : null } })" },
    { nombre: 'no se actualiza el cliente en memoria',
      de: '        c.lista_precio_id = tildado ? l.id : null\n', a: '' },
    { nombre: 'destildar a uno de otra lista se la saca',
      de: '      if (tildado === tiene) { pintarClientesLista(); return }', a: '      if (tildado === tiene && tildado) { pintarClientesLista(); return }' },
    { nombre: 'un doble toque manda dos veces',
      de: '      if (!l || l.guardando) return\n', a: '      if (!l) return\n' },
    { nombre: 'mientras guarda el tilde no se traba',
      de: "${l.guardando === c.id ? ' disabled' : ''}", a: '' },
    { nombre: 'el error no se muestra',
      de: "${error ? `<span class=\"ad-error-pegado\">${esc(error)}</span>` : ''}", a: '' },
    { nombre: 'el error sin escapar',
      de: '<span class="ad-error-pegado">${esc(error)}</span>', a: '<span class="ad-error-pegado">${error}</span>' },
    { nombre: 'el error no queda guardado',
      de: "        l.errores.set(clienteId, err?.message || 'No se pudo guardar. Probá de nuevo.')\n", a: '' },
    { nombre: 'no se avisa el éxito',
      de: "        mostrarExito(tildado ? `${nombre} ahora usa la lista ${listaDe(l.id)?.nombre ?? ''}.` : `${nombre} ya no tiene lista de precios.`)\n", a: '' },
    { nombre: 'pintarLista no pinta los clientes',
      de: "      document.getElementById('ad-confirmar-precios-si').disabled = estado.trabajando\n      pintarClientesLista()\n", a: "      document.getElementById('ad-confirmar-precios-si').disabled = estado.trabajando\n" },
    { nombre: 'el cambio del tilde no llama',
      de: '        if (t) cambiarListaCliente(t.dataset.listaCliente, t.checked)', a: '        if (t) cambiarListaCliente(t.dataset.listaCliente, true)' },
  ],
})
