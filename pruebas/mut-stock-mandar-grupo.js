// Mutaciones de test-stock-mandar-grupo.js: "Mandar a otra empresa del grupo"
// en Stock (26/10/2026). De a una. Ver mutar.js.
//
//   node pruebas/mut-stock-mandar-grupo.js
'use strict'

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

correrMutacionesEnVarios([
  {
    suite: path.join(__dirname, 'test-stock-mandar-grupo.js'),
    original: path.join(__dirname, '..', 'modulos', 'stock.html'),
    funciones: [],
    manuales: [
      // La pantalla
      { nombre: 'el tercer botón fuera de la entrada', de: '      <button type="button" class="stock-eleccion__opcion stock-eleccion__opcion--grupo" id="btn-entrada-grupo" hidden>', a: '      <button type="button" class="stock-eleccion__opcion stock-eleccion__opcion--grupo" id="btn-entrada-grupo-x" hidden>' },
      { nombre: 'el tercer botón visible de entrada', de: 'id="btn-entrada-grupo" hidden>', a: 'id="btn-entrada-grupo">' },
      { nombre: 'el tercer botón no va a lo ancho', de: '    .stock-eleccion__opcion--grupo { grid-column: 1 / -1;', a: '    .stock-eleccion__opcion--grupo { grid-column: auto;' },
      { nombre: 'vuelve "Enviar a otra unidad"', de: 'id="btn-mandar-grupo" hidden>Mandar a otra empresa del grupo</button>', a: 'id="btn-mandar-grupo" hidden>Mandar a otra empresa del grupo</button><button id="btn-enviar-transferencia">Enviar a otra unidad</button>' },
      { nombre: 'el botón de Insumos sin conectar', de: "    document.getElementById('btn-mandar-grupo').addEventListener('click', mandarAOtraEmpresa)\n", a: '' },
      { nombre: 'el de la entrada sin conectar', de: "    document.getElementById('btn-entrada-grupo').addEventListener('click', mandarAOtraEmpresa)\n", a: '' },
      { nombre: 'el botón vuelve a abrir la transferencia', de: "    document.getElementById('btn-mandar-grupo').addEventListener('click', mandarAOtraEmpresa)", a: "    document.getElementById('btn-mandar-grupo').addEventListener('click', abrirModalTransferencia)" },
      { nombre: 'la barra no repinta los botones', de: '      cerrarPanelGrupo()\n      pintarMandarGrupo()\n', a: '      cerrarPanelGrupo()\n' },
      { nombre: 'la barra no cierra el panel', de: '      cerrarPanelGrupo()\n      pintarMandarGrupo()\n', a: '      pintarMandarGrupo()\n' },
      // Quién lo ve
      { nombre: 'sin mirar el permiso en la fábrica de la barra', de: "      if (elegida) return puedeTareaEn('retiros:cargar', elegida) ? [elegida] : []", a: '      if (elegida) return [elegida]' },
      { nombre: 'con "Todas", sin filtrar por permiso', de: "      return [...new Set(ids)].filter(id => puedeTareaEn('retiros:cargar', id))", a: '      return [...new Set(ids)]' },
      { nombre: 'con "Todas", repetidas', de: "      return [...new Set(ids)].filter(id => puedeTareaEn('retiros:cargar', id))", a: "      return ids.filter(id => puedeTareaEn('retiros:cargar', id))" },
      { nombre: 'con otro permiso', de: "      if (elegida) return puedeTareaEn('retiros:cargar', elegida) ? [elegida] : []", a: "      if (elegida) return puedeTareaEn('retiros:ver', elegida) ? [elegida] : []" },
      { nombre: 'el de Insumos siempre escondido', de: "      document.getElementById('btn-mandar-grupo').hidden = !puede", a: "      document.getElementById('btn-mandar-grupo').hidden = true" },
      { nombre: 'el de la entrada siempre visible', de: "      document.getElementById('btn-entrada-grupo').hidden = !puede", a: "      document.getElementById('btn-entrada-grupo').hidden = false" },
      // Lo que se lee
      { nombre: 'acá no se mira la fábrica', de: '      const clientes = (data ?? []).filter(c => c?.activo === true && deEstas.has(String(c.unidad_negocio_id)) &&', a: '      const clientes = (data ?? []).filter(c => c?.activo === true &&' },
      { nombre: 'acá no se mira activo', de: '      const clientes = (data ?? []).filter(c => c?.activo === true && deEstas.has(String(c.unidad_negocio_id)) &&', a: '      const clientes = (data ?? []).filter(c => deEstas.has(String(c.unidad_negocio_id)) &&' },
      { nombre: 'activo con cualquier valor', de: '(data ?? []).filter(c => c?.activo === true && deEstas', a: '(data ?? []).filter(c => c?.activo !== false && deEstas' },
      { nombre: 'la consulta sin activo', de: "select('id, nombre, activo, unidad_negocio_id, unidad_grupo_id')", a: "select('id, nombre, unidad_negocio_id, unidad_grupo_id')" },
      { nombre: 'acá vale cualquier fábrica de la barra', de: '      const deEstas = new Set(fabricas.map(String))', a: '      const deEstas = new Set([...fabricas, ...(estado.unidadesBarra ?? []).map(u => u.id)].map(String))' },
      { nombre: 'con Nuss en la barra, todas las del permiso', de: "      if (elegida) return puedeTareaEn('retiros:cargar', elegida) ? [elegida] : []", a: '' },
      { nombre: 'clientes de todas las fábricas', de: "        .in('unidad_negocio_id', fabricas).eq('activo', true)", a: ".eq('activo', true)" },
      { nombre: 'también los inactivos', de: "        .in('unidad_negocio_id', fabricas).eq('activo', true)", a: "        .in('unidad_negocio_id', fabricas)" },
      { nombre: 'sin filtrar los de grupo en la base', de: ".not('unidad_grupo_id', 'is', null)", a: '' },
      { nombre: 'la misma fábrica cuenta como otra empresa', de: '        c.unidad_grupo_id && c.unidad_grupo_id !== c.unidad_negocio_id)', a: '        c.unidad_grupo_id)' },
      { nombre: 'un error de la base se tapa', de: "        .in('unidad_negocio_id', fabricas).eq('activo', true).not('unidad_grupo_id', 'is', null).order('nombre')\n      if (error) throw error", a: "        .in('unidad_negocio_id', fabricas).eq('activo', true).not('unidad_grupo_id', 'is', null).order('nombre')\n      if (error) return []" },
      { nombre: 'el nombre de la empresa es el de la fábrica que manda', de: '        empresa: nombres.get(c.unidad_grupo_id) || nombreDeUnidadBarra(c.unidad_grupo_id),', a: '        empresa: nombres.get(c.unidad_negocio_id) || nombreDeUnidadBarra(c.unidad_negocio_id),' },
      { nombre: 'sin los nombres de la barra si falla la tabla', de: '        empresa: nombres.get(c.unidad_grupo_id) || nombreDeUnidadBarra(c.unidad_grupo_id),', a: '        empresa: nombres.get(c.unidad_grupo_id),' },
      // A dónde va
      { nombre: 'el link a otra pantalla', de: "      return 'retiros.html?cliente=' + encodeURIComponent(id)", a: "      return 'administracion.html?cliente=' + encodeURIComponent(id)" },
      { nombre: 'el id sin escapar para la URL', de: "      return 'retiros.html?cliente=' + encodeURIComponent(id)", a: "      return 'retiros.html?cliente=' + id" },
      { nombre: 'con una sola no va derecho', de: '      if (opciones.length === 1) { estado.grupo = null;', a: '      if (false) { estado.grupo = null;' },
      { nombre: 'con una sola deja el panel', de: '      if (opciones.length === 1) { estado.grupo = null; pintarPanelGrupo(); irA', a: '      if (opciones.length === 1) { irA' },
      { nombre: 'sin permiso igual consulta', de: '      const fabricas = fabricasParaMandar()\n      if (!fabricas.length) return\n', a: '      const fabricas = fabricasParaMandar()\n' },
      { nombre: 'un error no se dice', de: "        estado.grupo = { cargando: false, error: 'No se pudieron leer las empresas del grupo. Revisá la conexión y probá de nuevo.', opciones: [] }", a: '        estado.grupo = { cargando: false, error: null, opciones: [] }' },
      // El panel
      { nombre: 'sin ninguna no lo dice', de: "      if (!g.opciones.length) return '<p class=\"stock-grupo__titulo\">Esta fábrica no tiene ninguna otra empresa del grupo como cliente. Se carga en Administración → Clientes.</p>' + cerrar", a: "      if (!g.opciones.length) return cerrar" },
      { nombre: 'nunca dice desde dónde', de: '      const varias = new Set(g.opciones.map(o => o.desde)).size > 1', a: '      const varias = false' },
      { nombre: 'siempre dice desde dónde', de: '      const varias = new Set(g.opciones.map(o => o.desde)).size > 1', a: '      const varias = true' },
      { nombre: 'la empresa sin escapar', de: '`<strong>${esc(o.empresa)}</strong>', a: '`<strong>${o.empresa}</strong>' },
      { nombre: 'el cliente sin escapar', de: '<span>${esc(o.nombre)}${varias', a: '<span>${o.nombre}${varias' },
      { nombre: 'la fábrica sin escapar', de: " · desde ${esc(o.desde)}` : ''}", a: " · desde ${o.desde}` : ''}" },
      { nombre: 'el link del panel sin encodeURIComponent', de: 'href="retiros.html?cliente=${encodeURIComponent(o.id)}"', a: 'href="retiros.html?cliente=${esc(o.id)}"' },
      { nombre: 'el link del panel a otra pantalla', de: 'href="retiros.html?cliente=${encodeURIComponent(o.id)}"', a: 'href="stock.html?cliente=${encodeURIComponent(o.id)}"' },
      { nombre: 'el id sin escapar en el data-*', de: 'data-grupo-cliente="${esc(o.id)}"', a: 'data-grupo-cliente="${o.id}"' },
      { nombre: 'sin Cancelar', de: "<button type=\"button\" class=\"btn-stock btn-stock--chico stock-grupo__cerrar\" data-grupo-cerrar>Cancelar</button>'", a: "'" },
      { nombre: 'el panel no se esconde', de: '      el.hidden = !g\n', a: '' },
      { nombre: 'cerrar no cierra', de: '    function cerrarPanelGrupo() {\n      estado.grupo = null\n', a: '    function cerrarPanelGrupo() {\n' },
    ],
  },
])
