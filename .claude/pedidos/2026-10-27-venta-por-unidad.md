# Pedido 27/10/2026 — Venta por unidad (URGENTE, antes de precios-compra)

Rama `ci-prueba/venta-por-unidad`. No toca `produccion.html`: se integra apenas esté en verde (ensayo, respaldo, merge --no-ff, pruebas, push, GitHub en verde).

**Base** (27/10/2026, en producción; verificar con information_schema / pg_get_functiondef):
- `producto_presentaciones.sin_stock` (boolean, default false). Hoy = true en "Conos de papel sueltos · Por cono" (unidades_por_caja = 1), en Nuss y en Dolce.
- `registrar_orden_retiro`, para esas presentaciones, NO mira stock: el lote viaja como venga (`"lotes":[{lote,cajas}]` o sin lotes = 'SIN LOTE'), entra y sale en el mismo momento y nunca devuelve stock_insuficiente.
- Precio en la Lista 1 (Turi · Tissot · Richard): $27 por cono.

**Qué hacer:**
1. Carga (`modulos/retiros.html`): si la presentación tiene sin_stock = true: aparece en el catálogo SIEMPRE, sin "sin stock" y sin tener que buscarla; no se pide lote ni se muestra la lista de lotes; no aparece "¿De dónde salen?".
2. La cantidad se pregunta en UNIDADES con la palabra del producto: "¿Cuántos conos?". Si unidades_por_caja = 1 decir "conos" / "unidades", nunca "cajas". El cono (marca) se pide como siempre.
3. Hoja impresa y PDF, renglón: CANT. = la cantidad de conos; PRODUCTO = "Conos de papel sueltos"; DESCRIPCIÓN = "con cono GIOVANI" (sin "×1"); TOTAL = "720 un.".
4. Hoja impresa y PDF, fila TOTAL: las presentaciones con sin_stock = true o unidades_por_caja = 1 NO suman a "cajas de producto"; van como unidades: "TOTAL · 3 cajas de producto + 720 un.". Caso real: la N-0035 de Turi (3 Cucuruchón Grande + 720 conos GIOVANI) hoy imprime "723 cajas".
5. Administración (valorizar): el precio es por cono, como cualquier presentación de 1 unidad; con la Lista 1 propone $27.
6. Mis retiros y la ficha de la orden: mostrar "720 conos", no "720 cajas".

**Pruebas:** suites test-/mut- de la Carga y de la hoja (que fallen si vuelve a decir "cajas" para estos o si la fila TOTAL los suma como cajas), maqueta, y e2e a 390 y 1280 con una orden a Turi de 3 cajas de Cucuruchón Grande + 720 conos GIOVANI. Errores de la base tal cual; todo texto de la base con esc().

Mismo resumen único al final de toda la cola. Último mensaje, solo: TERMINADO — mandar al chat
