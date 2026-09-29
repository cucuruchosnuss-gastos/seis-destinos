// Mutaciones de test-buscar-clientes.js (el buscador de clientes con
// buscar_clientes(), 29/09/2026). Ver mutar.js. Tres tandas, una por archivo:
// Administración (Cobranzas por asentar), la carga de Órdenes de retiro y la
// carga de Pedidos, cada una por su variable.
//
//   node pruebas/mut-buscar-clientes.js
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const SUITE = path.join(__dirname, 'test-buscar-clientes.js')
const MODULOS = path.join(__dirname, '..', 'modulos')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(MODULOS, 'administracion.html'),
    variable: 'ARCHIVO_TEST',
    region: limitesAdministracion,
    funciones: ['htmlOpcionCliente', 'htmlResultadosAsentar', 'htmlResultadosLocales'],
    equivalentes: [
      { expr: "esc('Escribí al menos ' + MIN_LETRAS_BUSCAR + ' letras para buscar entre los clientes de todas las empresas.')", motivo: 'texto constante del código' },
      { expr: "esc(resto.length === 1 ? 'Otro parecido a lo que escribió el chofer:' : 'Otros parecidos a lo que escribió el chofer:')", motivo: 'texto constante del código' },
      { expr: "esc(mas === 1 ? 'Y 1 cliente más: seguí escribiendo.' : 'Y ' + mas + ' clientes más: seguí escribiendo.')", motivo: 'texto constante con un número' },
      { expr: 'esc(cb.errorClientes)', motivo: 'texto constante del código: lo pone abrirAsentar()' },
    ],
    manuales: [
      { nombre: 'admin: todos los sugeridos como botones', de: '      const botones = a.sugeridos.slice(0, SUGERIDOS_EN_BOTONES)\n', a: '      const botones = a.sugeridos\n' },
      { nombre: 'admin: el resto no va de lista inicial', de: '        const resto = a.sugeridos.slice(SUGERIDOS_EN_BOTONES)\n', a: '        const resto = []\n' },
      { nombre: 'admin: se busca desde 1 letra', de: '      if (q.length >= MIN_LETRAS_BUSCAR && !buscaEnLaListaLocal() && a.remoto?.texto !== q) {', a: '      if (q.length >= 1 && !buscaEnLaListaLocal() && a.remoto?.texto !== q) {' },
      { nombre: 'admin: sin espera', de: '        a.espera = setTimeout(() => consultarClientesAsentar(a), ESPERA_BUSCAR_MS)', a: '        consultarClientesAsentar(a)' },
      { nombre: 'admin: no cancela la consulta anterior', de: '      clearTimeout(a.espera)\n      const q = limpio(texto)', a: '      const q = limpio(texto)' },
      { nombre: 'admin: busca en una sola fábrica', de: "{ p_busqueda: q, p_unidad_negocio_id: null }", a: '{ p_busqueda: q, p_unidad_negocio_id: estado.empresaId }' },
      { nombre: 'admin: sin turno', de: '      if (turno !== a.turno || estado.cobranzas.asentando !== a || a.remoto?.texto !== q) return', a: '      if (estado.cobranzas.asentando !== a || a.remoto?.texto !== q) return' },
      { nombre: 'admin: una respuesta de otro texto se usa', de: '      if (turno !== a.turno || estado.cobranzas.asentando !== a || a.remoto?.texto !== q) return', a: '      if (turno !== a.turno || estado.cobranzas.asentando !== a) return' },
      { nombre: 'admin: null se toma como "no hay resultados"', de: '        filas = data === null ? null : sinUnidadesDePrueba(', a: '        filas = data === null ? [] : sinUnidadesDePrueba(' },
      { nombre: 'admin: un error no se dice', de: '      if (r.error) {\n        return', a: '      if (false) {\n        return' },
      { nombre: 'admin: sin saldo', de: '      const detalle = [razon, empresa, textoSaldoCorto(cl.saldo)].filter(Boolean).join', a: "      const detalle = [razon, empresa, ''].filter(Boolean).join" },
      { nombre: 'admin: a favor se lee como deuda', de: "      return n > 0 ? 'Debe ' + importeCob(n) : 'A favor ' + importeCob(-n)", a: "      return 'Debe ' + importeCob(n)" },
      { nombre: 'admin: sin la empresa', de: "      const empresa = limpio(cl.empresa) || nombreEmpresa(cl.unidad_negocio_id) || 'Empresa sin nombre'", a: "      const empresa = ''" },
      { nombre: 'admin: no se elige lo que trajo la base', de: '        : rem ? { id, nombre: rem.nombre, empresa: rem.empresa ?? nombreEmpresa(rem.unidad_negocio_id) }', a: '        : rem ? null' },
      { nombre: 'admin: la cuenta de prueba consulta la base', de: '      return estado.fabrica?.soyDePrueba === true', a: '      return false' },
      { nombre: 'admin: los botones se repiten en los resultados', de: '      const lista = r.filas.filter(c => !enBotones.has(c.cliente_id))', a: '      const lista = r.filas' },
      { nombre: 'admin: la búsqueda local sin la clave', de: '        porClave(c.nombre) || porClave(c.razon_social) ||\n        (Array.isArray(c.apodos) && c.apodos.some', a: '        (Array.isArray(c.apodos) && c.apodos.some' },
      { nombre: 'admin: la clave no saca la "y"', de: "      return normalizar(texto).replace(/[^a-z0-9]+/g, '').replace(/^(.)y(.)$/, '$1$2')", a: "      return normalizar(texto).replace(/[^a-z0-9]+/g, '')" },
      { nombre: 'admin: cancelar deja la consulta programada', de: '      clearTimeout(estado.cobranzas.asentando?.espera)\n', a: '' },
      { nombre: 'admin: "Buscando…" nunca', de: "      if (!r || r.texto !== q || r.filas === undefined) return '<div class=\"ad-texto-suave\">Buscando…</div>'", a: '      if (!r || r.texto !== q) return \'\'' },
    ],
  },
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE_RETIROS || path.join(MODULOS, 'retiros.html'),
    variable: 'ARCHIVO_RETIROS',
    funciones: ['htmlResultadoCliente', 'htmlResultadosClientes'],
    equivalentes: [
      { expr: 'esc(estado.errorClientes)', motivo: 'texto constante del código' },
    ],
    manuales: [
      { nombre: 'retiros: sin la empresa de la orden', de: '{ p_busqueda: q, p_unidad_negocio_id: empresaId }', a: '{ p_busqueda: q, p_unidad_negocio_id: null }' },
      { nombre: 'retiros: sin espera', de: '        estado.esperaBuscarClientes = setTimeout(() => consultarClientesRetiro(q, empresaId), ESPERA_BUSCAR_MS)', a: '        consultarClientesRetiro(q, empresaId)' },
      { nombre: 'retiros: desde 1 letra', de: '      if (q.length >= MIN_LETRAS_BUSCAR && buscarClientesEnLaBase() && !busquedaVigente(q)) {', a: '      if (q.length >= 1 && buscarClientesEnLaBase() && !busquedaVigente(q)) {' },
      { nombre: 'retiros: repregunta el mismo texto', de: '      if (q.length >= MIN_LETRAS_BUSCAR && buscarClientesEnLaBase() && !busquedaVigente(q)) {', a: '      if (q.length >= MIN_LETRAS_BUSCAR && buscarClientesEnLaBase()) {' },
      { nombre: 'retiros: null no se anota', de: '        if (data === null) { estado.buscarClientesSinPermiso = true; return }', a: '        if (data === null) { return }' },
      { nombre: 'retiros: null tapa la lista local', de: '        if (data === null) { estado.buscarClientesSinPermiso = true; return }', a: '        if (data === null) { estado.buscarClientesSinPermiso = true }' },
      { nombre: 'retiros: se cuela otra empresa', de: '        filas = (Array.isArray(data) ? data : []).filter(c => c && (c.unidad_negocio_id == null || c.unidad_negocio_id === empresaId))', a: '        filas = (Array.isArray(data) ? data : [])' },
      { nombre: 'retiros: sin turno', de: '      if (turno !== estado.turnoBuscarClientes || empresaId !== estado.empresaId || limpio(estado.form?.clienteBusqueda) !== q) return', a: '      if (empresaId !== estado.empresaId || limpio(estado.form?.clienteBusqueda) !== q) return' },
      { nombre: 'retiros: otra empresa se usa', de: '      if (turno !== estado.turnoBuscarClientes || empresaId !== estado.empresaId || limpio(estado.form?.clienteBusqueda) !== q) return', a: '      if (turno !== estado.turnoBuscarClientes || limpio(estado.form?.clienteBusqueda) !== q) return' },
      { nombre: 'retiros: otro texto se usa', de: '      if (turno !== estado.turnoBuscarClientes || empresaId !== estado.empresaId || limpio(estado.form?.clienteBusqueda) !== q) return', a: '      if (turno !== estado.turnoBuscarClientes || empresaId !== estado.empresaId) return' },
      { nombre: 'retiros: no se incorpora lo que trajo la base', de: '      const c = clienteDe(id) ?? incorporarClienteDeBusqueda(id)', a: '      const c = clienteDe(id)' },
      { nombre: 'retiros: muestra el saldo', de: '          return htmlResultadoCliente(c, x.empresa || empresaActual()?.nombre)', a: "          return htmlResultadoCliente(c, (x.empresa || '') + ' · Debe $ ' + x.saldo)" },
      { nombre: 'retiros: sin la empresa', de: "      const d = [limpio(empresa) || 'Empresa sin nombre', detalleCliente(c)].filter(Boolean).join(' · ')", a: "      const d = [detalleCliente(c)].filter(Boolean).join(' · ')" },
      { nombre: 'retiros: la fábrica de pruebas consulta', de: '      return !estado.buscarClientesSinPermiso && !!estado.empresaId && !estado.fabrica?.unidades?.has?.(estado.empresaId)', a: '      return !estado.buscarClientesSinPermiso && !!estado.empresaId' },
      { nombre: 'retiros: sin permiso vuelve a preguntar', de: '      return !estado.buscarClientesSinPermiso && !!estado.empresaId && !estado.fabrica?.unidades?.has?.(estado.empresaId)', a: '      return !!estado.empresaId && !estado.fabrica?.unidades?.has?.(estado.empresaId)' },
      { nombre: 'retiros: la búsqueda local sin la clave', de: '        porClave(c.nombre) || porClave(c.razon_social) ||\n        (Array.isArray(c.apodos)', a: '        (Array.isArray(c.apodos)' },
      { nombre: 'retiros: lo de la base no se muestra', de: '      const r = q.length >= MIN_LETRAS_BUSCAR ? busquedaVigente(q) : null', a: '      const r = null' },
      { nombre: 'retiros: la clave no saca la "y"', de: "      return normalizar(texto).replace(/[^a-z0-9]+/g, '').replace(/^(.)y(.)$/, '$1$2')", a: "      return normalizar(texto).replace(/[^a-z0-9]+/g, '')" },
    ],
  },
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE_PEDIDOS || path.join(MODULOS, 'pedidos.html'),
    variable: 'ARCHIVO_PEDIDOS',
    funciones: ['htmlResultadoClienteForm', 'htmlResultadosClientes'],
    equivalentes: [
      { expr: 'esc(estado.errorClientes)', motivo: 'texto constante del código' },
    ],
    manuales: [
      { nombre: 'pedidos: sin la unidad del pedido', de: '{ p_busqueda: q, p_unidad_negocio_id: unidadId }', a: '{ p_busqueda: q, p_unidad_negocio_id: null }' },
      { nombre: 'pedidos: sin espera', de: '        estado.esperaBuscarClientes = setTimeout(() => consultarClientesForm(q, unidadId), ESPERA_BUSCAR_MS)', a: '        consultarClientesForm(q, unidadId)' },
      { nombre: 'pedidos: desde 1 letra', de: '      if (q.length >= MIN_LETRAS_BUSCAR && buscarClientesEnLaBase(unidadId) && !busquedaVigente(q, unidadId)) {', a: '      if (q.length >= 1 && buscarClientesEnLaBase(unidadId) && !busquedaVigente(q, unidadId)) {' },
      { nombre: 'pedidos: null no se anota', de: '        if (data === null) { estado.buscarClientesSinPermiso = true; return }', a: '        if (data === null) { return }' },
      { nombre: 'pedidos: null tapa la lista local', de: '        if (data === null) { estado.buscarClientesSinPermiso = true; return }', a: '        if (data === null) { estado.buscarClientesSinPermiso = true }' },
      { nombre: 'pedidos: se cuela otra unidad', de: '        filas = (Array.isArray(data) ? data : []).filter(c => c && (c.unidad_negocio_id == null || c.unidad_negocio_id === unidadId))', a: '        filas = (Array.isArray(data) ? data : [])' },
      { nombre: 'pedidos: sin turno', de: '      if (turno !== estado.turnoBuscarClientes || !f || f.unidadId !== unidadId || limpio(f.clienteBusqueda) !== q) return', a: '      if (!f || f.unidadId !== unidadId || limpio(f.clienteBusqueda) !== q) return' },
      { nombre: 'pedidos: otra unidad se usa', de: '      if (turno !== estado.turnoBuscarClientes || !f || f.unidadId !== unidadId || limpio(f.clienteBusqueda) !== q) return', a: '      if (turno !== estado.turnoBuscarClientes || !f || limpio(f.clienteBusqueda) !== q) return' },
      { nombre: 'pedidos: otro texto se usa', de: '      if (turno !== estado.turnoBuscarClientes || !f || f.unidadId !== unidadId || limpio(f.clienteBusqueda) !== q) return', a: '      if (turno !== estado.turnoBuscarClientes || !f || f.unidadId !== unidadId) return' },
      { nombre: 'pedidos: no se incorpora lo que trajo la base', de: '      if (!(estado.clientes ?? []).some(c => c.id === id) && !incorporarClienteDeBusqueda(id)) return', a: '      if (!(estado.clientes ?? []).some(c => c.id === id)) return' },
      { nombre: 'pedidos: lo incorporado queda inactivo', de: '        activo: true, unidad_negocio_id: r.unidad_negocio_id ?? estado.buscarClientes.unidadId }', a: '        activo: false, unidad_negocio_id: r.unidad_negocio_id ?? estado.buscarClientes.unidadId }' },
      { nombre: 'pedidos: muestra el saldo', de: '          return htmlResultadoClienteForm(c, x.empresa || nombreUnidad(unidadId))', a: "          return htmlResultadoClienteForm(c, (x.empresa || '') + ' · Debe $ ' + x.saldo)" },
      { nombre: 'pedidos: sin la empresa', de: "      const meta = [limpio(empresa) || 'Unidad sin nombre', limpio(c.localidad)].filter(Boolean).join(' · ')", a: "      const meta = [limpio(c.localidad)].filter(Boolean).join(' · ')" },
      { nombre: 'pedidos: la fábrica de pruebas consulta', de: '      return !estado.buscarClientesSinPermiso && !!unidadId && !estado.fabrica?.unidades?.has?.(unidadId)', a: '      return !estado.buscarClientesSinPermiso && !!unidadId' },
      { nombre: 'pedidos: sin unidad consulta', de: '      return !estado.buscarClientesSinPermiso && !!unidadId && !estado.fabrica?.unidades?.has?.(unidadId)', a: '      return !estado.buscarClientesSinPermiso && !estado.fabrica?.unidades?.has?.(unidadId)' },
      { nombre: 'pedidos: sin permiso vuelve a preguntar', de: '      return !estado.buscarClientesSinPermiso && !!unidadId && !estado.fabrica?.unidades?.has?.(unidadId)', a: '      return !!unidadId && !estado.fabrica?.unidades?.has?.(unidadId)' },
      { nombre: 'pedidos: la búsqueda local sin la clave', de: '        (qc.length >= MIN_LETRAS_BUSCAR && claveBusquedaCliente(c.nombre).startsWith(qc)) ||\n', a: '' },
      { nombre: 'pedidos: lo de la base no se muestra', de: '      const r = q.length >= MIN_LETRAS_BUSCAR ? busquedaVigente(q, unidadId) : null', a: '      const r = null' },
      { nombre: 'pedidos: la clave no saca la "y"', de: "      return normalizar(texto).replace(/[^a-z0-9]+/g, '').replace(/^(.)y(.)$/, '$1$2')", a: "      return normalizar(texto).replace(/[^a-z0-9]+/g, '')" },
    ],
  },
])
