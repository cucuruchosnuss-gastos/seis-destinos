# Traspaso 27/10/2026 — la hoja nueva de la orden (rama `ci-prueba/hoja-orden-nueva`)

Pedido: `.claude/pedidos/2026-10-26-hoja-orden-nueva.md` (tarea 4 de la cola). Detalle: `docs/memoria/retiros.md` → "LA HOJA NUEVA DE LA ORDEN".

## Qué quedó
- `js/retiros-comun.js`: la tabla CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE (con precios, P. UNIT. e IMPORTE) y la fila "TOTAL · N cajas de producto + B bultos + U un." con los kilos. Funciones nuevas: `porCajaHoja`, `nombreConoHoja`, `bultoInsumoHoja`, `descripcionCortaHoja`, `cantidadColHoja`, `totalColHoja`, `rotuloTotalHoja`, `totalPesoHoja` (y las internas `htmlDescripcionHoja`, `htmlLotesHoja`, `bultosHoja`). Se fueron `cantidadHoja`, `totalInsumosHoja` y `textoLotesHoja`; `descripcionHoja` ahora es "producto + descripción" (las notas del faltante).
- La Carga y Administración leen `insumos.nombre_bulto` y pasan `nombreBulto`, `conoNombre` y (Administración) `porCaja`.
- Mismo encabezado, pie, blanco y negro, original + duplicado, modo hojas enteras; la impresión y el PDF son la misma `htmlHoja`.

## Verificado en la base (solo lectura)
- `insumos.nombre_bulto`: text, nullable, sin default (`information_schema`, 26 y 27/10/2026).
- N-0031 y N-0032 leídas de `ordenes_retiro` / `orden_retiro_items` (26/10/2026) para los casos de prueba. `mis_ordenes_retiro` no trae `unidades_por_caja` ni `nombre_bulto` (`pg_get_functiondef`): la Carga usa unidades ÷ cajas y el catálogo.

## Decidido sin consultar
- **Sin kilos en la orden, la celda TOTAL de la fila TOTAL queda vacía** (el pedido dice "la suma de kg de los insumos"); los **litros** van aparte ("125 kg + 3 lt").
- Un **insumo por kg sin bulto** no suma a "U un." (va en los kilos); "por litro" para `lt`.
- Sin marca, la descripción del insumo arranca en mayúscula ("Bolsa de 50 kg", "Por unidad").
- Una **devolución** sigue en su sección, con "−" en CANT. y en TOTAL y el motivo debajo de la descripción.
- Cada lote con su cantidad va junto (la línea se corta entre lotes, nunca "W-" / "0915").
- **Con precios**, columnas más angostas y 1 px de aire arriba y abajo (la letra sigue en 14 px, pedido del 23/10): así 8 renglones con observaciones siguen en media hoja con 10 mm de margen (123,0 mm de 136; con el aire de siempre medía 127,8 y `e2e/54` lo frenaba).
- El texto para compartir por WhatsApp (`textoOrden`) no cambió: el pedido habla de la hoja y del PDF.

## Pruebas
- `test-/mut-retiros-hoja-nueva.js` 81 / 55 de 55 (el común, la Carga y Administración), con todos los casos del pedido y N-0031 / N-0032.
- Al día: `test-retiros-hoja` (170; mut 75/75), `-hoja-sin-cortes` (74; 29/29), `-carga`, `-devoluciones` (101; 68/68), `-insumos-bulto` (42; 20/20), `-xss`, `-lotes` (82/82), `test-administracion-ordenes`, `-insumos-bulto` (63; 33/33); `e2e/28`, `54`, `57`, `66`, `67`.
- Maqueta `retiros-hoja-nueva` y `e2e/69-hoja-orden-nueva.spec.js` a 390 y 1280 (43 en verde junto con los de la hoja).

## No se pudo probar
- La hoja impresa en papel y el PDF compartido desde un celular de verdad (se probó en Chromium y WebKit de Playwright, y el PDF con html2canvas + jsPDF en `e2e/66`).
- La letra Archivo de Google Fonts en la medición local (en la compu se mide con la de respaldo, como siempre).

## Qué automatizaría ahora
- **Medir la hoja con un caso nuevo me llevó un script a mano** (`medir-hoja.js` en el scratchpad: levanta la maqueta, arma la hoja y lista el alto de cada renglón y qué celda se parte). Pasarlo a `npm run medir-hoja -- <maqueta> <orden>` en `pruebas/` sirve cada vez que se toque la hoja.
