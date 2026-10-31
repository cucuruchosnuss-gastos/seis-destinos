# Pedido de Facu — 29/10/2026: Corregir orden en Administración

Rama: `ci-prueba/corregir-orden`, desde `origin/ci-prueba/recibir-entre-empresas` (2003aa3: main + el detalle de la orden
interna). Toca solo `modulos/administracion.html` (más pruebas, maqueta, e2e y docs). No toca `modulos/produccion.html`
ni `modulos/remitos-dolce.html`. No se integra (se integra de noche, después de que otro chat audite el patch) y no se
toma el candado.

## La base (ya hecha por el chat de la base; solo se lee)
- `orden_para_corregir(p_orden_id)` → la orden con `no_se_puede`, `items` (con sus lotes) y `correcciones`. Pide
  retiros:precios.
- `corregir_orden_retiro(p_orden_id, p_items, p_motivo, p_fecha, p_transporte, p_observaciones)` → { codigo,
  total_antes, total_despues, valorizada, stock_insuficiente[] }. Pide retiros:precios y retiros:cargar; motivo de 3
  letras; valorizada no cambia la fecha; p_items en el formato de registrar_orden_retiro más `precio` por renglón.

## Lo pedido
1. "Corregir orden" en el detalle de la orden, al lado de Valorizar y Anular: con retiros:precios en esa fábrica y la
   orden no anulada, también en las valorizadas. Sin retiros:cargar: decidir (mirar sin guardar, o el error de la base).
2. Al abrir, orden_para_corregir; si `no_se_puede` trae texto, el aviso y no deja editar.
3. Editor de renglones con lo que ya existe (el catálogo de "Nuevo acopio", js/remitos-comun.js): cambiar producto,
   cono o insumo; cajas o cantidad; agregar y sacar renglones; varios lotes por renglón con cuánto falta repartir (sin
   lotes = la base elige / SIN LOTE); insumos con decimales según la unidad (nunca un número en value="…").
   Devoluciones y reposiciones se conservan.
4. Valorizada: el precio de cada renglón, editable; renglón nuevo sin precio → la lista ("Faltan precios" tal cual).
5. Fecha, transporte y observaciones editables; la fecha bloqueada si está valorizada, con la explicación.
6. Motivo obligatorio (3 letras).
7. Antes de guardar, un resumen de lo que cambia y, valorizada, total antes → después y la diferencia que va a la cuenta
   corriente del cliente (o a la deuda entre empresas).
8. Guardar → corregir_orden_retiro; stock_insuficiente como al cargar una orden; relee la orden y el listado; errores
   tal cual; doble toque manda una vez.
9. "Corregida N veces" en el detalle con el historial (fecha y hora de Argentina, quién, motivo, total antes → después).
10. Todo escapado; 390 y 1280 px sin scroll horizontal.

Pruebas: `test-/mut-administracion-corregir-orden.js` (baseline = 2003aa3) y `e2e/100-corregir-orden.spec.js`.
