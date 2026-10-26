# Pedido 26/10/2026 — la orden de retiro en una fábrica sin control de stock (Rosario / Dolce Pasta)

Rama ci-prueba/orden-sin-stock-rosario (desde origin/main 8c42d68). No toca modulos/produccion.html: integrarla apenas
esté en verde (ensayo, respaldo, merge --no-ff, pruebas, push, GitHub en verde).

BASE (ya en producción, hecha por el chat de la base el 26/10/2026; verificarla con pg_get_functiondef antes de codificar):
- unidades_negocio.controla_stock_terminado boolean (default true). Dolce Pasta = false.
- registrar_orden_retiro: en una fábrica con controla_stock_terminado = false, cada renglón de producto (retiro o
  reposición) NO mira stock. Los lotes de "lotes":[{lote,cajas}] se normalizan (trim + mayúsculas, vacío = 'SIN LOTE'),
  entran con un 'ajuste' automático y salen con el 'despacho' en el mismo momento. Sin "lotes" = un solo lote
  'SIN LOTE'. Nunca devuelve stock_insuficiente.
- anular_orden_retiro ahora también revierte los 'ajuste' de la orden.
- En Dolce, el cliente PAZ, MIRTA (010f816d…) tiene unidad_grupo_id = Nuss y la lista "Dolce Pasta → Nuss (interna)"
  (vacía), con apodos Nuss / Cucuruchos Nuss / Córdoba. El espejo a Nuss ya funciona (traspaso_entrada con los mismos lotes).

PANTALLA — Carga de órdenes (modulos/retiros.html) cuando la fábrica de la orden tiene controla_stock_terminado = false
(leerlo de unidades_negocio):
1. El catálogo muestra TODOS los productos terminados activos de esa fábrica, sin marcarlos "sin stock" ni ponerlos al
   55 %, y sin pedir búsqueda para verlos.
2. Al elegir un producto, en lugar de la lista de lotes con stock: cajas totales y debajo renglones de lote escritos a
   mano (lote + cajas), con un botón "+ Agregar lote". Ejemplo: 84 cajas → lote 10430: 30, "+ Agregar lote" → 10433:
   39, y así. Mostrar "Asignado X de Y · faltan Z". Para confirmar, la suma tiene que dar el total (sin ningún lote
   escrito se permite, viaja sin "lotes" y la base pone SIN LOTE, pero avisar "Va sin lote").
3. Sacar el paso "¿De dónde salen?", el aviso de faltante, "Completar con los más viejos" y "Que salga sola…" para esa
   fábrica.
4. Los insumos de Dolce siguen como hoy: Dolce sí lleva stock de insumos.
5. La hoja impresa y el PDF muestran los lotes escritos, igual que siempre.
6. En las fábricas con control (Nuss, Mengui) nada cambia: pruebas que lo garanticen.
Suites test-/mut- de la Carga para los dos modos, la maqueta con una fábrica sin control, e2e a 390 y 1280 px. npm run
pruebas, check-scripts y check-bytes en verde. Resumen con rama, hash y main. Agregar en docs/memoria/retiros.md la
sección de la fábrica sin control de stock.
