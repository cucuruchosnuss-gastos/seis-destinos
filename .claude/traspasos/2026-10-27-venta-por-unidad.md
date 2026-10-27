# Traspaso 27/10/2026 — Venta por unidad (conos de papel sueltos)

Rama `ci-prueba/venta-por-unidad`, desde `origin/main` `7793c83`. Pedido: `.claude/pedidos/2026-10-27-venta-por-unidad.md`. Detalle en `docs/memoria/retiros.md` y `administracion.md` ("LA VENTA POR UNIDAD").

## Lo hecho
- Carga: los "Conos de papel sueltos · Por cono" (`sin_stock`) siempre en el catálogo, sin lotes ni "¿De dónde salen?", "¿Cuántos conos se lleva?", "720 conos" en todos lados; a la base `{ presentacion_id, marca_id, cajas: 720 }` sin lotes.
- Hoja y PDF: CANT. 720 | Conos de papel sueltos | con cono GIOVANI | 720 un.; "TOTAL · 3 cajas de producto + 720 un."; el texto para compartir igual.
- Mis retiros y la ficha: "3 cajas + 720 conos"; Administración: la lista "3 cajas + 720 un.", la ficha "720 conos" y "Precio x cono".

## Decidido sin consultar
- **El precio de $ 27 lo propone la PANTALLA, no `precio_venta`.** `precio_venta` (leída el 27/10/2026) toma el precio de la presentación SIN cono del producto y le suma el conito; los conos sueltos solo tienen "Por cono" (con cono), así que devuelve "sin precio". Para lo que se vende por unidad, Administración usa el precio que la lista tiene para ESA presentación (`lista_precios_items`, vigente a la fecha): $ 27 en la Lista 1. **Para el chat de la base:** si `precio_venta` se ajusta para estas presentaciones, la pantalla ya no necesita el respaldo (queda sin efecto solo).
- La palabra: "conos" si el producto empieza con "cono"; si no, "unidades".
- La lista de órdenes de Administración dice "un." (no sabe el nombre del producto sin leer más).
- La hoja sigue mostrando el lote que guardó la base ("SIN LOTE").

## No probado
- Una orden real a Turi contra la base y su valorización (la base es de solo lectura para Claude Code).
