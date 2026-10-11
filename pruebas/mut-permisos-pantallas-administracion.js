// Mutaciones de test-permisos-pantallas-administracion.js (M2 y B2,
// 11/10/2026). De a una.
//
//   node pruebas/mut-permisos-pantallas-administracion.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-permisos-pantallas-administracion.js'),
  original: path.join(__dirname, '..', 'modulos', 'administracion.html'),
  funciones: [],
  manuales: [
    // M2
    { nombre: 'M2: gestionar sin pedidos:configurar', de: "      return puedeEn('pedidos', 'configurar', unidadId) || puedeEn('retiros', 'precios', unidadId) ||\n        (!!unidadId && tieneTarea('cuentas_corrientes', 'alta_proveedor'))", a: "      return puedeEn('retiros', 'precios', unidadId) ||\n        (!!unidadId && tieneTarea('cuentas_corrientes', 'alta_proveedor'))" },
    { nombre: 'M2: gestionar sin alta_proveedor', de: "      return puedeEn('pedidos', 'configurar', unidadId) || puedeEn('retiros', 'precios', unidadId) ||\n        (!!unidadId && tieneTarea('cuentas_corrientes', 'alta_proveedor'))", a: "      return puedeEn('pedidos', 'configurar', unidadId) || puedeEn('retiros', 'precios', unidadId)" },
    { nombre: 'M2: pedidos:configurar sin alcance', de: "      return puedeEn('pedidos', 'configurar', unidadId) || puedeEn('retiros', 'precios', unidadId) ||", a: "      return tieneTarea('pedidos', 'configurar') || puedeEn('retiros', 'precios', unidadId) ||" },
    { nombre: 'M2: la sección Clientes sin "también"', de: "permiso: ['retiros', 'ver'], tambien: (u) => puedeGestionarCliente(u) },", a: "permiso: ['retiros', 'ver'] }," },
    { nombre: 'M2: la empresa no entra por gestionar', de: "        puedeEn('retiros', 'ver', e.id) || puedeEn('retiros', 'precios', e.id) || puedeEn('retiros', 'anular', e.id) ||\n        puedeGestionarCliente(e.id))", a: "        puedeEn('retiros', 'ver', e.id) || puedeEn('retiros', 'precios', e.id) || puedeEn('retiros', 'anular', e.id))" },
    { nombre: 'M2: mostrarClientes lo manda a la portada', de: "      if (enTodas ? !empresasDeClientes().length : !(puedeEn('retiros', 'ver') || puedeGestionarCliente())) { mostrarInicio(); return }", a: "      if (enTodas ? !empresasDeClientes().length : !puedeEn('retiros', 'ver')) { mostrarInicio(); return }" },
    { nombre: 'M2: sin el modo solo provisorios', de: "      if (!enTodas && !puedeEn('retiros', 'ver')) {\n        pintarClientes()", a: "      if (false) {\n        pintarClientes()" },
    { nombre: 'M2: muestra también los no provisorios', de: '      const provisorios = (filas ?? []).filter(c => c?.provisorio === true && c.activo !== false)', a: '      const provisorios = (filas ?? []).filter(c => c.activo !== false)' },
    { nombre: 'M2: muestra los apagados', de: '      const provisorios = (filas ?? []).filter(c => c?.provisorio === true && c.activo !== false)', a: '      const provisorios = (filas ?? []).filter(c => c?.provisorio === true)' },
    { nombre: 'M2: el nombre sin escapar', de: '<span class="ad-renglon__desc">${esc(c.nombre)}</span>` +\n        `<span class="ad-sello ad-sello--provisorio">Provisorio</span></span>`', a: '<span class="ad-renglon__desc">${c.nombre}</span>` +\n        `<span class="ad-sello ad-sello--provisorio">Provisorio</span></span>`' },
    { nombre: 'M2: sin el aviso de solo provisorios', de: '      let html = `<div class="ad-aviso">${esc(TEXTO_SOLO_PROVISORIOS)}</div>`', a: "      let html = ''" },
    { nombre: 'M2: sin leer, dice "no hay"', de: '      if (r.sinLeer) return html + `<div class="ad-aviso ad-aviso--grave">${esc(TEXTO_SIN_LEER_CLIENTES)}</div>`\n', a: '' },
    { nombre: 'M2: sin el respaldo de buscar_clientes', de: "      } else if (['cobranzas:procesar', 'retiros:ver', 'pedidos:ver'].some(k => { const [m, t] = k.split(':'); return tieneTarea(m, t) })) {", a: '      } else if (false) {' },
    { nombre: 'M2: lee la tabla sin poder', de: '      if (puedeLeerClientes(unidadId)) {\n        filas = await leerClientes(unidadId)', a: '      if (true) {\n        filas = await leerClientes(unidadId)' },
    { nombre: 'M2: sin "Confirmar" directo', de: "      else if (puedeConfirmar(unidad)) botones.push(", a: '      else if (false) botones.push(' },
    { nombre: 'M2: puedeConfirmar vuelve a pedir precios', de: '    function puedeConfirmar(unidadId) {\n      return puedeGestionarCliente(unidadId)', a: "    function puedeConfirmar(unidadId) {\n      return puedeEn('retiros', 'precios', unidadId)" },
    { nombre: 'M2: Unir vuelve a pedir el alta', de: "      if (puedeGestionarCliente(unidad)) botones.push(`<button type=\"button\" class=\"ad-btn ad-btn--secundario\" data-provisorio-unir", a: "      if (puedeDarAlta(unidad)) botones.push(`<button type=\"button\" class=\"ad-btn ad-btn--secundario\" data-provisorio-unir" },
    { nombre: 'M2: abrirUnir vuelve a pedir el alta', de: '      if (clientesEnTodas() || !puedeGestionarCliente(estado.empresaId)) return', a: '      if (clientesEnTodas() || !puedeDarAlta(estado.empresaId)) return' },
    { nombre: 'M2: confirmar no llama a la base', de: "        const { error } = await supabase.rpc('confirmar_cliente', { p_cliente_id: id })\n        if (error) throw error\n        estado.provConfirmar = null", a: '        estado.provConfirmar = null' },
    { nombre: 'M2: el error de confirmar no se muestra', de: '        `${pc?.error ? `<span class="ad-error-pegado">${esc(pc.error)}</span>` : \'\'}</div>`', a: "        `</div>`" },
    { nombre: 'M2: la tarjeta cuenta activos', de: "      if (s.id === 'clientes' && !puedeEn('retiros', 'ver')) {", a: "      if (false) {" },
    // B2
    { nombre: 'B2: los lotes sin alcance (stock)', de: "      return puedeEn('stock', 'ver', unidadId) || ['cargar', 'ver', 'configurar'].some(t => puedeEn('produccion', t, unidadId))", a: "      return tieneTarea('stock', 'ver') || ['cargar', 'ver', 'configurar'].some(t => puedeEn('produccion', t, unidadId))" },
    { nombre: 'B2: los lotes sin alcance (producción)', de: "      return puedeEn('stock', 'ver', unidadId) || ['cargar', 'ver', 'configurar'].some(t => puedeEn('produccion', t, unidadId))", a: "      return puedeEn('stock', 'ver', unidadId) || ['cargar', 'ver', 'configurar'].some(t => tieneTarea('produccion', t))" },
    { nombre: 'B2: la orden no pasa su fábrica', de: '      if (puedeVerLotes(o.unidad_negocio_id)) {', a: '      if (puedeVerLotes(estado.empresaId)) {' },
  ],
})
