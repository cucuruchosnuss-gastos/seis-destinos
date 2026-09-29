// Mutaciones de test-tablero-html.js (el HTML del tablero, js/tablero.js):
// las AUTOMÁTICAS sacan cada escTab() de los renders (tienen que dar rojo), y
// las de a mano rompen un estado o una regla visible. Ver mutar.js. De a una.
//
//   node pruebas/mut-tablero-html.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-tablero-html.js'),
  original: path.join(__dirname, '..', 'dashboard.html'),
  funciones: ['htmlCtx', 'htmlMaquinas', 'htmlTendencia', 'htmlCuerpo', 'htmlPie', 'htmlTarjeta', 'htmlFranja', 'htmlEscondidas'],
  escape: 'escTab',
  manuales: [
    { nombre: 'el escape no escapa comillas', de: "export function escTab(texto) {\n  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')\n    .replace(/\"/g, '&quot;')", a: "export function escTab(texto) {\n  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')\n    " },
    { nombre: 'lo urgente sin bordó', de: "`<a class=\"tb-res${r.urgente ? ' tb-res--urgente' : ''}\"", a: '`<a class="tb-res"' },
    { nombre: 'sin mis_pendientes dice "Nada pendiente"', de: '    fin = m.pendError\n', a: '    fin = false\n' },
    { nombre: 'con renglones y mis_pendientes caído no avisa', de: "  } else if (m.pendError) fin = '<div class=\"tb-pie__nota\">No se pudo saber todo lo pendiente.</div>'", a: '  }' },
    { nombre: 'una tarjeta sin pie afirma "Nada pendiente"', de: "  if (m.estado === 'cargando' || m.estado === 'error' || m.sinPie) return ''", a: "  if (m.estado === 'cargando' || m.estado === 'error') return ''" },
    { nombre: 'el error muestra el pie', de: "  if (m.estado === 'cargando' || m.estado === 'error' || m.sinPie) return ''", a: "  if (m.estado === 'cargando' || m.sinPie) return ''" },
    { nombre: 'Reintentar sin su clave', de: 'data-reintentar="${escTab(m.clave)}"', a: 'data-reintentar=""' },
    { nombre: 'el error no se anuncia', de: '<div class="tb-error" role="alert">', a: '<div class="tb-error">' },
    { nombre: 'sin datos dibuja un número', de: "  const principal = m.estado === 'ok'\n", a: "  const principal = m.estado !== 'cargando'\n" },
    { nombre: 'la barrita pasa del 100 %', de: 'Math.max(0, Math.min(100, Number(x.pct) || 0))', a: 'Number(x.pct) || 0' },
    { nombre: 'acomodar: la tarjeta sigue navegando', de: "    : `<div class=\"tb-tarjeta__cab\">${icono}<a class=\"tb-tarjeta__abrir\"", a: "    : `<div class=\"tb-tarjeta__cab\">${icono}<a class=\"tb-tarjeta__abrir-x\"" },
    { nombre: 'acomodar: sin manija', de: '<button type="button" class="tb-manija" data-manija="${escTab(t.clave)}"', a: '<button type="button" class="tb-manija" data-manija-x="${escTab(t.clave)}"' },
    { nombre: 'acomodar: el tamaño actual sin marcar', de: "class=\"tb-seg__op${z === tam ? ' tb-seg__op--activa' : ''}\" data-tamano-de=", a: 'class="tb-seg__op" data-tamano-de=' },
    { nombre: 'acomodar: sin esconder', de: 'data-esconder="${escTab(t.clave)}"', a: 'data-no="${escTab(t.clave)}"' },
    { nombre: 'la tarjeta no abre el módulo', de: '<a class="tb-tarjeta__abrir" href="${escTab(t.url)}">', a: '<span class="tb-tarjeta__abrir">' },
    { nombre: 'la franja vacía dibuja el título', de: "  if (!items?.length) return ''\n", a: '' },
    { nombre: 'la parada no va en bordó', de: "`<div class=\"tb-maquina tb-maquina--${q.tipo === 'mal' ? 'mal'", a: "`<div class=\"tb-maquina tb-maquina--${q.tipo === 'mal' ? 'bien'" },
    { nombre: 'cargando sin los huesos', de: '<div class="tb-hueso tb-hueso--numero"></div>', a: '' },
    { nombre: 'escondidas sin "Mostrar"', de: 'data-mostrar="${escTab(t.clave)}">Mostrar</button>', a: '>Mostrar</button>' },
  ],
})
