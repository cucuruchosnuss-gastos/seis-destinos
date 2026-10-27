# Pedido 26/10/2026 — la hoja nueva de la orden (tarea 4 de la cola)

Copiado del chat (CAMBIO EN LA COLA del 26/10/2026). Reemplaza a cualquier "TAREA 4 — ci-prueba/hoja-insumos-prolija"
(no había ninguna rama con ese nombre: no se descartó nada).

TAREA 4 (después de la 3) — ci-prueba/hoja-orden-nueva. No toca produccion.html: se integra apenas esté en verde.
Rediseño de la hoja de la orden (js/retiros-comun.js: htmlHoja, sus estilos y lo que arma los renglones), aprobado por Facu
el 26/10/2026 con un ejemplo. Mismo encabezado, pie, blanco y negro, original + duplicado.

COLUMNAS, todo a lo ancho y un renglón por producto: CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE
- CANT.: número grande. Producto terminado = cajas; insumo por bulto = bultos; insumo sin bulto = su cantidad.
- PRODUCTO: el nombre del producto o del insumo, en negrita, sin cortarse.
- DESCRIPCIÓN:
  · Producto terminado: SOLO "×{unidades_por_caja}" y, si lleva cono, " · con cono {NOMBRE DEL CONO}" (cono en negrita).
    NUNCA el nombre de la presentación ("Caja sin cono", "Media caja", "Caja N°2", "media altura"), ni "sin cono", ni doble
    bolsa, ni la caja usada.
  · Insumo: marca (si tiene) + " · {nombre_bulto} de {contenido} {unidad}" si va por bulto (insumos.nombre_bulto, columna
    nueva del 26/10/2026: 'bolsa' | 'caja' | 'bidón' | …; null = "bulto"), o " · por unidad" / " · por kg" si no. La marca
    de una caja dice "Sin impresión" / "Impresa Nuss" y eso SÍ va.
- TOTAL: producto terminado = cajas × unidades_por_caja en "un." (10.080 un.); insumo = la cantidad en su unidad (250 kg, 80 un.).
- LOTE: un lote = solo el lote. Varios = en la misma línea "6262-1 (30) · 6263-2 (12)", con la cantidad entre paréntesis más
  chica. Sin lote = "—".
- Fila TOTAL: "TOTAL · N cajas de producto + B bultos + U un." (sacando las partes que dan 0; nunca "0 cajas") y en la
  columna TOTAL la suma de kg de los insumos.
- Con precios (la hoja valorizada de Administración): agregar P. UNIT. e IMPORTE al final, con las mismas reglas de descripción.
- Si no entra en media hoja, el modo hoja entera que ya existe.
Casos para probar: Cucuruchón Grande ×240 en 2 lotes, ×224 con cono DUOMO, Mini ×160, Chico ×128, Harina Wali en 2 lotes,
Colorante Nico bidón de 25 kg, Caja media altura sin impresión por unidad, y las órdenes reales N-0031 (Rodrigo, solo
insumos) y N-0032 (Richard).
Igual en la impresión y en el PDF compartido. Suites de la hoja con sus mutaciones (incluido "nunca dice sin cono / doble
bolsa / media caja"), maqueta a 390 y 1280 px. Leé insumos.nombre_bulto con information_schema antes de usarla.
