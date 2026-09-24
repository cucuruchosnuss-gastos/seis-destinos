# Pedidos — lo que falta en la base para que el módulo se pueda otorgar (23/09/2026)

Para el **chat de permisos** (o Claude Code con escritura, con reporte a Facu).
Todo lo de abajo se leyó contra la base el 23/09/2026; **no se corrió nada**:
esta sesión tenía Supabase en solo lectura.

## 1. Las tres tareas de Pedidos NO están en `chk_tarea_valida` — BLOQUEANTE

El `CATALOGO_TAREAS` de `modulos/accesos.html` ya tiene el grupo "Pedidos"
(`41fe94c`) con `pedidos:ver`, `pedidos:cargar` y `pedidos:configurar`, las
tres **con alcance por unidad** y **con bypass de super_admin** (las RPCs usan
`tiene_tarea_alcance()`, no `tiene_tarea_explicita()`). El CHECK tiene 40 claves
y ninguna de pedidos, así que **hoy tildar una de las tres y guardar lo rechaza
la base**. Es el caso que el passthrough NO cubre: el catálogo está ADELANTE del
CHECK.

Qué significa cada una (ya está en la descripción de cada tarea en Accesos):

| clave | qué habilita | la exige |
|---|---|---|
| `pedidos:ver` | leer clientes, pedidos y renglones (sus tres policies de SELECT) y la lista (`pedidos_de`) | las tres policies, `pedidos_de` |
| `pedidos:cargar` | cargar y corregir un pedido, marcar su avance, entregarlo o anularlo | `guardar_pedido`, `marcar_avance_pedido`, `cambiar_estado_pedido` |
| `pedidos:configurar` | dar de alta y editar los clientes y sus apodos | `guardar_cliente` |

Ninguna RPC cambió de firma: son las que ya estaban.

**El SQL, leyendo el CHECK real antes** (regla del territorio compartido: nunca
regenerarlo de memoria). Lo de abajo son las 40 leídas el 23/09/2026 más las
tres nuevas; **volvé a leer el constraint antes de correrlo** por si entró otra
clave en el medio:

```sql
select pg_get_constraintdef(oid) from pg_constraint where conname = 'chk_tarea_valida';

alter table empleado_tareas drop constraint chk_tarea_valida;
alter table empleado_tareas add constraint chk_tarea_valida check ((modulo || ':' || tarea) = any (array[
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
  'pedidos:ver', 'pedidos:cargar', 'pedidos:configurar'
]));

-- Verificación: 43 claves, y las tres nuevas adentro.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'chk_tarea_valida';
```

Cuando esté, `pruebas/test-accesos-produccion.js` y `pruebas/test-accesos-pedidos.js`
se actualizan: la lista del CHECK pasa a 43 y el aviso de "todavía NO están en
el CHECK" de accesos.html se saca (hoy hay una assertion que lo exige, así que
hay que tocar las dos cosas juntas).

## 2. Quien solo tiene tareas de Pedidos NO ve los productos — RECOMENDADO

Los renglones apuntan al catálogo de Producción, y sus policies de SELECT son
(leídas con `pg_policy` el 23/09/2026):

- `productos_terminados` — "produccion: leer productos": `puede_ver_produccion() OR tiene_tarea('stock','ver')`
- `producto_presentaciones` — "produccion: leer presentaciones": lo mismo
- `marcas_personalizadas` — "produccion: leer marcas": lo mismo

Alguien que carga pedidos y no tiene ninguna tarea de Producción ni de Stock
**recibe cero productos, sin error**. La pantalla lo dice y deja cargar todo
como "No sé qué es", pero así no sirve. La propuesta, **a decidir con el chat
de Producción** porque las policies son suyas:

```sql
alter policy "produccion: leer productos" on productos_terminados
  using (puede_ver_produccion() or tiene_tarea('stock','ver')
         or tiene_tarea_alcance('pedidos','ver', unidad_negocio_id)
         or tiene_tarea_alcance('pedidos','cargar', unidad_negocio_id));
alter policy "produccion: leer presentaciones" on producto_presentaciones
  using (puede_ver_produccion() or tiene_tarea('stock','ver')
         or tiene_tarea('pedidos','ver') or tiene_tarea('pedidos','cargar'));
alter policy "produccion: leer marcas" on marcas_personalizadas
  using (puede_ver_produccion() or tiene_tarea('stock','ver')
         or tiene_tarea('pedidos','ver') or tiene_tarea('pedidos','cargar'));
```

(Antes de correrlo, releer las tres con `pg_get_expr(polqual, polrelid)`:
`ALTER POLICY ... USING` reemplaza la condición entera.)

## 3. `pedidos:cargar` sin `pedidos:ver` no puede elegir cliente

La policy de `clientes` es `tiene_tarea_alcance('pedidos','ver', unidad)`, así
que quien tiene solo `cargar` no ve ningún cliente en el buscador. Dos salidas,
a elegir:

- **en el catálogo** (lo más simple): `requiere: ['pedidos:ver']` en
  `pedidos:cargar`, igual que `cuentas_corrientes:ver_todo` requiere
  `gastos:ver_exportar` — y la regla del lado del servidor en
  `actualizar_permisos_empleado`;
- **en la base**: sumar `or tiene_tarea_alcance('pedidos','cargar', unidad_negocio_id)`
  a la policy de `clientes`.

Mientras tanto, conviene otorgar `ver` junto con `cargar`.
