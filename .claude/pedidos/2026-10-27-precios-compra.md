# Pedido 27/10/2026 — Precios de compra

Rama `ci-prueba/precios-compra`. No toca `produccion.html`: se integra apenas esté en verde.

**Base** (27/10/2026, en producción; verificar con `pg_get_functiondef` / `information_schema`):
- `materia_prima_items.precio_unitario` = precio de compra SIN IVA por unidad de medida del insumo (kg, un, lt); `alicuota_iva` = % de IVA (0 si vino sin IVA). Hoy la pantalla de ingreso no los guarda, aunque `ocr-materia-prima` ya devuelve `precio_unitario`, `precio_total` y `alicuota_iva` por renglón.
- `precios_compra(p_unidad_negocio_id, p_hasta default null)` → por insumo el último precio (de un ingreso o de un costo manual, el más nuevo): insumo, marca, unidad_medida, contenido_bulto, nombre_bulto, precio_unitario, alicuota_iva, precio_final (con IVA), fecha, origen ('compra'|'manual'), proveedor, comprobante. Permiso: `stock:ver_costos` o `retiros:precios`.
- `guardar_costo_insumo` tiene un 6.º parámetro `p_alicuota_iva` (default null = 0).
- `valorizar_orden_retiro`: en una orden INTERNA (cliente con `unidad_grupo_id`), un insumo sin precio en la lista interna toma el último precio de compra CON IVA de la empresa que lo manda.
- Órdenes internas: código `<prefijo>-I-0001` (numeración propia). Revisar que ninguna lista ordene ni busque por `numero` mezclando internas y comunes: ordenar por fecha/código.

**Qué hacer:**
1. Ingreso de materia prima: en cada renglón de insumo, "Precio unitario sin IVA" e "IVA %" (0 / 10,5 / 21 / 27 y otro), con el "Precio final con IVA" calculado al lado.
   - Precarga desde el OCR. Si la factura trae precio por bulto (bolsa de 25 kg a $17.500), convertirlo a precio por unidad de medida con el contenido del bulto, y mostrar las dos cosas: "$ 17.500 la bolsa = $ 700 el kg".
   - Factura X, remito o "sin IVA" = IVA 0.
   - Se guardan en `materia_prima_items`. Precio opcional, pero si hay factura A y falta, avisar en amarillo.
2. Lista de precios de compra: reemplazar la vista Costos de Stock por "Precios de compra" con `precios_compra()`.
   - Columnas: Insumo | Precio unitario | IVA % | Precio final. Para los insumos por bulto, también el precio del bulto con IVA.
   - Debajo de cada uno, de dónde salió (proveedor, comprobante, fecha) y el historial.
   - Cargar a mano (`guardar_costo_insumo` con IVA) sigue disponible.
3. En la Carga, a un cliente del grupo marcarlo como "Orden interna" y mostrar el código N-I-…; en Administración, el sello "Orden interna" en lugar de "Entre empresas".

Suites test-/mut-, maqueta y e2e a 390 y 1280. Errores de la base tal cual; todo texto de la base con `esc()`.

Al final de toda la cola: un solo resumen completo (por tarea: rama, hash, si se integró, qué se probó, qué salió mal, qué se decidió sin consultar, qué no se pudo probar y "Qué automatizaría ahora"). Que no quede nada corriendo en segundo plano. Último mensaje, solo: TERMINADO — mandar al chat
