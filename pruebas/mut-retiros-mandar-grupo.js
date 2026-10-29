// Mutaciones de test-retiros-mandar-grupo.js: la Carga abierta desde "Mandar a
// otra empresa del grupo" (?cliente=<id>, 26/10/2026). De a una. Ver mutar.js.
//
//   node pruebas/mut-retiros-mandar-grupo.js
'use strict'

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

correrMutacionesEnVarios([
  {
    suite: path.join(__dirname, 'test-retiros-mandar-grupo.js'),
    original: path.join(__dirname, '..', 'modulos', 'retiros.html'),
    funciones: [],
    manuales: [
      { nombre: 'lee otro parámetro', de: ".get('cliente') || null } catch { return null }", a: ".get('id') || null } catch { return null }" },
      { nombre: 'vacío cuenta como cliente', de: ".get('cliente') || null } catch { return null }", a: ".get('cliente') } catch { return null }" },
      { nombre: 'no saca el parámetro', de: "        u.searchParams.delete('cliente')\n", a: '' },
      { nombre: 'saca todo lo demás', de: "        history.replaceState(history.state, '', u.pathname + u.search + u.hash)", a: "        history.replaceState(history.state, '', u.pathname)" },
      { nombre: 'init no lo saca', de: '      if (clienteUrl) sacarClienteDeLaUrl()\n', a: '' },
      { nombre: 'init no abre con el cliente', de: '      if (clienteUrl && await abrirConCliente(clienteUrl)) {', a: '      if (false) {' },
      { nombre: 'init empieza igual otra orden', de: "      if (clienteUrl && await abrirConCliente(clienteUrl)) { if (window.lucide) window.lucide.createIcons(); return }", a: '      if (clienteUrl) await abrirConCliente(clienteUrl)' },
      { nombre: 'un error de la base se tapa', de: "        if (error) throw error\n        c = data\n", a: '        c = data\n' },
      { nombre: 'sin poder leer, sin aviso', de: "        mostrarError('No se pudo leer a qué empresa mandar. Elegí el cliente acá.')\n", a: '' },
      { nombre: 'un cliente común también', de: '      if (!c || c.activo === false || !empresaGrupoDe(c) || ', a: '      if (!c || c.activo === false || ' },
      { nombre: 'un inactivo también', de: '      if (!c || c.activo === false || !empresaGrupoDe(c) || ', a: '      if (!c || !empresaGrupoDe(c) || ' },
      { nombre: 'de cualquier fábrica', de: ' || !empresasDeCarga().some(e => e.id === c.unidad_negocio_id)) {', a: ') {' },
      { nombre: 'el que no sirve, sin aviso', de: "        mostrarError('No se encontró esa empresa del grupo en una fábrica donde puedas cargar órdenes.')\n", a: '' },
      { nombre: 'pisa la orden a medio cargar', de: '      if (formTieneDatos(leerBorrador()?.form) && retomarBorrador()) {', a: '      if (false) {' },
      { nombre: 'un borrador vacío también frena', de: '      if (formTieneDatos(leerBorrador()?.form) && retomarBorrador()) {', a: '      if (leerBorrador() && retomarBorrador()) {' },
      { nombre: 'la orden a medio cargar sin aviso', de: "        mostrarError('Tenías una orden a medio cargar: terminala o vaciala, y volvé a «Mandar a otra empresa del grupo».')\n", a: '' },
      { nombre: 'sigue la orden vieja de la misma fábrica', de: '      estado.form = null\n      await aplicarEmpresa(c.unidad_negocio_id)', a: '      await aplicarEmpresa(c.unidad_negocio_id)' },
      { nombre: 'no cambia de fábrica', de: '      await aplicarEmpresa(c.unidad_negocio_id)', a: '      await abrirFormulario()' },
      { nombre: 'elige sin esperar la lista', de: '      await aplicarEmpresa(c.unidad_negocio_id)', a: '      aplicarEmpresa(c.unidad_negocio_id)' },
      { nombre: 'aplicarEmpresa no devuelve la promesa', de: '      return abrirFormulario()\n    }\n', a: '      abrirFormulario()\n    }\n' },
      { nombre: 'no elige el cliente', de: '      if (estado.empresaId === c.unidad_negocio_id && estado.form) elegirCliente(id)\n', a: '' },
      { nombre: 'el aviso con el texto viejo', de: '`Es una orden interna: la mercadería va en tránsito hasta que ${nombreEmpresaGrupo(id)} la reciba (con los mismos lotes)`', a: '`Entre empresas: lo que sale entra al stock de ${nombreEmpresaGrupo(id)}`' },
      { nombre: 'el aviso sin "los mismos lotes"', de: '`Es una orden interna: la mercadería va en tránsito hasta que ${nombreEmpresaGrupo(id)} la reciba (con los mismos lotes)`', a: '`Es una orden interna: la mercadería va en tránsito hasta que ${nombreEmpresaGrupo(id)} la reciba`' },
    ],
  },
])
