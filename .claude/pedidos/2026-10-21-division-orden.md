# Pedido del 21/10/2026 — Dividir una orden para facturar (rama `ci-prueba/division-orden-facturar`)

**Commit y push de la rama, SIN integrar: la audita el chat de la base.** Si la sesión se compacta, se retoma desde este archivo.

## El pedido (tal cual llegó)

CONTEXTO: cada cliente tiene una "condición de venta": un % de cada orden va a la PARTE A y el resto a la PARTE B. A la parte A se le suma APARTE una comisión (21% por defecto). Se factura TODO en ARCA, fuera de la app: esta pantalla le da a Yanina los dos montos impresos para facturar, y después ella pega los números de factura que le da ARCA. La orden real NO cambia (una sola, con sus lotes, su stock y su total); las comisiones no se registran como plata en la app.

BASE (21/10/2026, en producción, probada por el chat de la base):
- clientes.pct_parte_a (null = no se divide), clientes.comision_parte_a_pct (default 21).
- RPC guardar_condicion_venta_cliente(p_cliente_id, p_pct_a, p_comision_pct) → void. Pide retiros:precios.
- RPC datos_division_orden(p_orden_id, p_pct_a default null, p_comision_pct default null) → jsonb {orden_id, codigo, fecha, cliente, cliente_cuit, pct_a, pct_b, comision_pct, items[{orden, descripcion, unidad, precio, cantidad, cant_a, cant_b, subtotal_a, subtotal_b}], subtotal_a, comision_a, total_a, subtotal_b, total_b, total_orden, guardada, facturas[{parte, numero, archivo_url}]}. Calcula sin guardar (sirve para la vista previa con otros %). Usa el % de la orden si ya se guardó, si no el del cliente. Si no hay %, error en castellano. La orden tiene que estar valorizada.
- RPC guardar_division_orden(p_orden_id, p_pct_a, p_comision_pct) → jsonb (lo mismo que datos_division_orden).
- RPC guardar_factura_orden(p_orden_id, p_parte 'A'|'B'|'UNICA', p_numero, p_archivo_url default null) → void.
- Tabla orden_facturas (select con retiros:precios o retiros:ver).
Errores de la base: mostrarlos tal cual. Todas piden retiros:precios en la empresa de la orden.

TAREA 1 — Ficha del cliente (donde hoy se editan los datos del cliente en Administración): bloque "Condición de venta":
- "Parte A %" y "Parte B %": al escribir uno, el otro se completa solo con la diferencia a 100. Vacío = la orden no se divide.
- "Comisión parte A %" (21 por defecto).
- Guardar con guardar_condicion_venta_cliente. Números con formato argentino (type="text", coma decimal).

TAREA 2 — En la orden de retiro VALORIZADA (donde hoy se valoriza / ve la orden en Administración): botón "Dividir para facturar".
- Abre una ventana con Parte A % / Parte B % (el otro se calcula solo) y Comisión %, prellenados con lo que devuelve datos_division_orden. Al cambiarlos, vista previa llamando de nuevo a datos_division_orden con los % nuevos (sin guardar).
- "Guardar e imprimir": guardar_division_orden y después la hoja.
- HOJA IMPRIMIBLE (A4 vertical, @media print oculta lo demás), dos bloques:
  · "<codigo>-A" (ej. N-0015-A): cliente y CUIT, fecha, % de la parte. Tabla: Producto, Cantidad (cant_a + unidad), Precio, Subtotal. Debajo de la tabla, NO como renglón: "Total productos: $ X", "Comisión <comision_pct>%: $ Y", "TOTAL: $ X+Y" (total_a).
  · "<codigo>-B": lo mismo con cant_b y subtotal_b, solo "TOTAL: $ total_b".
  · Renglones con cant_a = 0 no se imprimen en A (lo mismo en B).
  · Pie chico: "Orden <codigo> · total de la orden $ total_orden".
  Formato argentino ($ 1.234.567,89). Todo texto de la base con esc().
- Si el cliente no tiene condición de venta, la ventana arranca con los % vacíos y pide completarlos.

TAREA 3 — Números de factura de ARCA: en la misma ventana (y visible en la orden), por cada parte A y B (o "Factura única" si la orden no se divide):
- Campo "N° de factura ARCA" para pegar (texto libre, 3 a 40 caracteres) + "Subir PDF" opcional (bucket 'comprobantes', ruta facturas-venta/<empresa>/<año>/<codigo>-<parte>.pdf) → guardar_factura_orden.
- Mostrar el número guardado al lado de "<codigo>-A" / "<codigo>-B", también en la hoja impresa si ya existe.

PRUEBAS: unitarias, de mutación y e2e a 390, 360, tablet y 1280:
- B se completa solo a partir de A; vista previa con % distintos sin guardar.
- Hoja: comisión fuera de la tabla, totales correctos, renglones en 0 no se imprimen.
- Factura A, B y única; PDF opcional; errores de la base tal cual.
npm run pruebas, check-scripts, check-bytes en verde. Resumen con rama y hash.
