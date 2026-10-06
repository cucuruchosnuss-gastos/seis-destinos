// Mutaciones de test-cuentas-corrientes-cuenta-unica.js (cliente y proveedor
// en Cuentas corrientes, 06/10/2026). Ver mutar.js. Corren de a una.
//
//   node pruebas/mut-cuentas-corrientes-cuenta-unica.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-cuenta-unica.js')

correrMutacionesEnVarios([
  {
    suite: SUITE, original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: ['htmlClasificacionCC', 'pintarCuentaUnicaFicha'],
    manuales: [
      // ── Permisos ──────────────────────────────────────────────────────────
      { nombre: 'leer clientes sin permiso', de: "      return tieneTarea('retiros', 'ver') || tieneTarea('retiros', 'cargar') || tieneTarea('pedidos', 'ver') || tieneTarea('pedidos', 'cargar')", a: '      return true' },
      { nombre: 'clasificar sin permiso', de: "      return tieneTarea('cuentas_corrientes', 'alta_proveedor') || tieneTarea('retiros', 'precios') || tieneTarea('pedidos', 'configurar')", a: '      return true' },
      { nombre: 'compensar con UNA de las dos tareas', de: "      return tieneTarea('cuentas_corrientes', 'registrar_pago') && tieneTarea('cobranzas', 'procesar')", a: "      return tieneTarea('cuentas_corrientes', 'registrar_pago') || tieneTarea('cobranzas', 'procesar')" },
      { nombre: 'no se leen las tareas de pedidos', de: "'retiros', 'cobranzas', 'pedidos'])", a: "'retiros', 'cobranzas'])" },
      // ── El chip ──────────────────────────────────────────────────────────
      { nombre: 'chip: sin permiso igual consulta', de: "      estado.clientesProveedor = new Map()\n      if (!puedeLeerClientesCC()) return\n", a: '      estado.clientesProveedor = new Map()\n' },
      { nombre: 'chip: un cliente sin proveedor cuenta', de: '        if (!c?.proveedor_id) continue\n', a: '' },
      { nombre: 'chip: no mira la empresa', de: '      return !!s && (unidadId ? s.has(unidadId) : s.size > 0)', a: '      return !!s && s.size > 0' },
      { nombre: 'chip: la lista no pasa la empresa', de: 'esClienteYProveedor(g.proveedor_id, g.unidad_negocio_id)', a: 'esClienteYProveedor(g.proveedor_id)' },
      { nombre: 'chip: el padrón no mira la barra', de: 'esClienteYProveedor(p.id, estado.unidadElegida)', a: 'esClienteYProveedor(p.id)' },
      { nombre: 'chip: no se lee al arrancar', de: '        // Quiénes son también clientes (el chip "Cliente y proveedor").\n        cargarClientesProveedores(),\n', a: '' },
      // ── Los vínculos de la ficha ─────────────────────────────────────────
      { nombre: 'vínculos: sin permiso consulta igual', de: "      if (!puedeLeerClientesCC()) { ficha.vinculos = false; return }\n", a: '' },
      { nombre: 'vínculos: un error es "no es cliente"', de: "if (error) { console.error('No se pudo leer si también es cliente:', error); ficha.vinculos = false; return }", a: "if (error) { ficha.vinculos = []; return }" },
      { nombre: 'vínculos: "no se sabe" no se dice', de: "      if (vs === false) {\n", a: '      if (false) {\n' },
      { nombre: 'clasificación: no mira la empresa de la ficha', de: "      const valor = (ficha.unidadId ? !!v : vs.length > 0) ? 'ambos' : 'proveedor'", a: "      const valor = vs.length > 0 ? 'ambos' : 'proveedor'" },
      { nombre: 'clasificación: sin permiso se puede tocar', de: '        htmlClasificacion({ valor, propio: \'proveedor\', puede, ocupado: !!p?.enviando })', a: '        htmlClasificacion({ valor, propio: \'proveedor\', puede: true, ocupado: !!p?.enviando })' },
      { nombre: 'elegir: sin permiso abre igual', de: '      if (!f || !Array.isArray(f.vinculos) || !puedeClasificarCC() || f.panelVinculo?.enviando) return', a: '      if (!f || !Array.isArray(f.vinculos) || f.panelVinculo?.enviando) return' },
      { nombre: 'empresas: aparece la fábrica de pruebas', de: '          const opciones = unidadesParaElegir(estado.maestros.unidades).filter(u => !ya.has(u.id))', a: '          const opciones = estado.maestros.unidades.filter(u => !ya.has(u.id))' },
      // ── Vincular ─────────────────────────────────────────────────────────
      { nombre: 'vincular sin empresa', de: "      if (!p || p.tipo !== 'vincular' || !p.unidadId || p.enviando) return", a: "      if (!p || p.tipo !== 'vincular' || p.enviando) return" },
      { nombre: 'vincular dos veces con un doble toque', de: "      if (!p || p.tipo !== 'vincular' || !p.unidadId || p.enviando) return", a: "      if (!p || p.tipo !== 'vincular' || !p.unidadId) return" },
      { nombre: 'vincular con la empresa de la ficha y no la elegida', de: "{ p_proveedor_id: f.proveedorId, p_unidad_negocio_id: p.unidadId }", a: "{ p_proveedor_id: f.proveedorId, p_unidad_negocio_id: f.unidadId ?? p.unidadId, p_extra: 1 }" },
      { nombre: 'vincular nunca dice que se creó', de: "conocidos: fila ? conocidos : null,", a: 'conocidos: null,' },
      { nombre: 'vincular: el error tapado', de: "        p.error = err?.message || 'No se pudo vincular. Probá de nuevo.'", a: "        p.error = 'No se pudo vincular. Probá de nuevo.'" },
      { nombre: 'vincular: no relee los vínculos', de: "        f.panelVinculo = null\n        await Promise.all([cargarVinculosFicha(), cargarClientesProveedores()])\n        if (estado.ficha !== f) return\n        renderizarClasificacionProveedor()\n        prepararCuentaUnicaFicha()\n      } catch (err) {\n        console.error('No se pudo vincular:', err)", a: "        f.panelVinculo = null\n        renderizarClasificacionProveedor()\n      } catch (err) {\n        console.error('No se pudo vincular:', err)" },
      // ── Separar ──────────────────────────────────────────────────────────
      { nombre: 'separar sin elegir cuál', de: "      if (!p || p.tipo !== 'desvincular' || !p.clienteId || p.enviando) return", a: "      if (!p || p.tipo !== 'desvincular' || p.enviando) return" },
      { nombre: 'separar: el error tapado', de: "        p.error = err?.message || 'No se pudieron separar las cuentas. Probá de nuevo.'", a: "        p.error = 'No se pudieron separar las cuentas. Probá de nuevo.'" },
      { nombre: 'separar sin preguntar (directo a la base)', de: "        f.panelVinculo = { tipo: 'desvincular', clienteId: unico?.id ?? null, error: null, enviando: false }\n", a: "        f.panelVinculo = { tipo: 'desvincular', clienteId: unico?.id ?? null, error: null, enviando: false }\n        confirmarDesvincularCC()\n" },
      { nombre: 'separar en todas elige el primero solo', de: '        const unico = v ?? (f.vinculos.length === 1 ? f.vinculos[0] : null)', a: '        const unico = v ?? f.vinculos[0]' },
      { nombre: 'la compensación sin etiqueta en la cuenta del proveedor', de: "      if (gasto?.medio_pago === 'compensacion') return 'Compensación con su cuenta de cliente'\n", a: '' },
      // ── La cuenta juntas ─────────────────────────────────────────────────
      { nombre: 'cuenta: se vuelve a leer cada vez', de: '      if (f.unica?.clienteId === v.id) { pintarCuentaUnicaFicha(); return }\n', a: '' },
      { nombre: 'cuenta: en todas las unidades no dice nada', de: '      if (f && !f.unidadId && Array.isArray(f.vinculos) && f.vinculos.length) {', a: '      if (false) {' },
      { nombre: 'cuenta: sin vínculo queda la de antes', de: '      if (!v) { f.unica = null; pintarCuentaUnicaFicha(); return }', a: '      if (!v) { pintarCuentaUnicaFicha(); return }' },
    ],
  },
])
