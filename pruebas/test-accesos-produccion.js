// Las tres tareas de Producción en el CATALOGO_TAREAS de accesos.html
// (22/09/2026), en sincronía con el CHECK chk_tarea_valida.
//
// El CHECK se leyó con pg_get_constraintdef el 22/09/2026: 40 claves, las 37
// de antes más produccion:cargar, produccion:ver y produccion:configurar. Si el
// CHECK cambia, esta lista se actualiza leyendo el constraint real.
//
//   node pruebas/test-accesos-produccion.js

const fs = require('fs')
const path = require('path')
const { extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/accesos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const CHECK_22_09_2026 = [
  'gastos:ver_exportar', 'gastos:editar_anular', 'gastos:gastos_empresa', 'gastos:gestionar_proyectos',
  'caja:ver_listado', 'caja:retiros_todos', 'caja:movimientos_todos', 'caja:ingreso_externo_propio',
  'caja:ingreso_externo_empresa', 'caja:ver_empresa', 'caja:egreso_empresa', 'caja:traspaso_empresa',
  'caja:transferir_entre_personas', 'empleados:ver_editar', 'empleados:importar_naaloo', 'empleados:reasignar_unidad',
  'cuentas_corrientes:ver_todo', 'cuentas_corrientes:alta_proveedor', 'cuentas_corrientes:aprobar_rechazar_proveedor',
  'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:aplicar_credito', 'cuentas_corrientes:anular_factura',
  'cuentas_corrientes:asignar_proveedor_legado', 'facturas_pendientes:editar_interes', 'materia_prima:cargar',
  'materia_prima:ver_todo', 'materia_prima:editar_anular', 'stock:ver', 'stock:gestionar_catalogo', 'stock:dar_baja',
  'stock:enviar_transferencia', 'stock:recibir_transferencia', 'stock:ajustar_inventario', 'cobranzas:cargar',
  'cobranzas:ver_todo', 'cobranzas:procesar', 'cobranzas:editar_anular',
  'produccion:cargar', 'produccion:ver', 'produccion:configurar',
]

const CATALOGO = new Function(extraerConst(src, 'CATALOGO_TAREAS') + '\nreturn CATALOGO_TAREAS')()
const tareas = CATALOGO.flatMap(g => g.tareas || [])
const claves = tareas.map(t => `${t.modulo}:${t.tarea}`)

chk('el catálogo tiene exactamente las 40 claves del CHECK', claves.length === 40 && CHECK_22_09_2026.every(k => claves.includes(k)),
  `${claves.length}; faltan ${CHECK_22_09_2026.filter(k => !claves.includes(k)).join(', ')}`)
chk('ninguna clave repetida', new Set(claves).size === claves.length)

const grupo = CATALOGO.find(g => g.grupo === 'Producción')
chk('hay grupo Producción', !!grupo)
chk('el grupo cuelga del módulo produccion', JSON.stringify(grupo?.modulos) === '["produccion"]')
const esperadas = {
  cargar: 'Abrir y cerrar turnos, registrar masas, paradas y lo producido desde la tablet',
  ver: 'Ver el historial de producción y el stock terminado',
  configurar: 'Máquinas, recetas, productos, marcas, personal e insumos de cada ingrediente',
}
for (const [tarea, label] of Object.entries(esperadas)) {
  const t = (grupo?.tareas || []).find(x => x.modulo === 'produccion' && x.tarea === tarea)
  chk(`produccion:${tarea} está`, !!t)
  chk(`produccion:${tarea} con el label pedido`, t?.label === label, t?.label)
  chk(`produccion:${tarea} con alcance por unidad, como las de stock`, t?.conAlcance === true)
  chk(`produccion:${tarea} tiene descripción`, typeof t?.descripcion === 'string' && t.descripcion.length > 40)
  chk(`produccion:${tarea} sin dependencias`, !t?.requiere)
}

fin()
