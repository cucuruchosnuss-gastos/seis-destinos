# Pedido 26/10/2026 — producto terminado desde el Ingreso de materia prima

Rama ci-prueba/ingreso-terminado-desde-mp (desde main actualizado). Integrarla apenas esté en verde (no toca
modulos/produccion.html), con el procedimiento de siempre: respaldo, merge --no-ff, pruebas completas, push, GitHub en verde.

PROBLEMA: en Ingreso de materia prima (modulos/materia-prima.html) solo se pueden elegir insumos y materia prima. Hoy
quisieron cargar 44 cajas de Capelina Grande que trae Rodrigo Arrascaeta (proveedor) y no encontraron el producto. El
ingreso de producto terminado existe en produccion-gestion.html ("INGRESO DE PRODUCTO TERMINADO"), pero nadie lo busca ahí.

QUÉ HACER:
- En el ingreso de materia prima, cuando se elige un proveedor que tiene productos terminados con
  productos_terminados.origen_proveedor_id = ese proveedor (o al buscar un producto que no es insumo), ofrecer también
  esos productos terminados, marcados "Producto terminado".
- Al elegir uno, el renglón funciona igual que en "INGRESO DE PRODUCTO TERMINADO":
  · presentación y cajas;
  · "Último lote: <lote vigente>. ¿Sigue siendo este?" con [Sí] / [No, es otro]: si es otro, se escribe a mano, en
    mayúsculas, máx. 40;
  · remito.
  Se graba con la misma RPC: ingresar_producto_terminado(p_unidad_negocio_id, p_fecha, p_proveedor_id,
  p_unidad_origen_id = null, p_remito, p_items, p_observaciones, p_client_uuid). La base ya guarda el lote como vigente
  para el próximo ingreso.
- Si en un mismo ingreso hay insumos y productos terminados, se graban por separado (una RPC para cada parte) y el
  resumen muestra las dos.
- Reutilizar la lógica del ingreso de producto terminado de produccion-gestion.html; no copiarla distinta (si hace
  falta, sacarla a js/ como excepción numerada).
- Permiso: el mismo que pide la base (materia_prima:cargar o stock:ajustar_inventario en la fábrica). Errores de la
  base, tal cual. Todo texto de la base con esc().
PRUEBAS: unitarias + mutación + e2e a 390, 360, tablet y 1280 (Rodrigo → Capelina Grande → lote vigente "Sí" y "No, es
otro"). npm run pruebas, check-scripts y check-bytes en verde. Resumen con rama, hash y main.
No sacar ni cambiar el "INGRESO DE PRODUCTO TERMINADO" de produccion-gestion.html: las dos entradas quedan y graban igual.
