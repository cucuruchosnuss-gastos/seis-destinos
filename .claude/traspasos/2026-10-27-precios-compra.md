# Traspaso 27/10/2026 — Precios de compra

Rama `ci-prueba/precios-compra` (2588be6, 4ed4e89, más dos merges de main). Integrada en main `dd1397d` (respaldo `respaldo/antes-de-precios-compra` = `58b288f`). Pedido: `.claude/pedidos/2026-10-27-precios-compra.md`. Detalle en `docs/memoria/materia-prima.md` ("EL PRECIO DE COMPRA"), `stock.md`, `retiros.md` y `administracion.md`.

## Lo hecho
- Ingreso de MP: en cada renglón "Precio unitario sin IVA", "IVA %" (0 / 10,5 / 21 / 27 / Otro) y el final con IVA. Del OCR: el precio por bulto o por unidad (según cierre con el total de la línea) y "$ 17.500 la bolsa = $ 700 el kg". Factura X, remito o sin comprobante: IVA 0 fijo. Se guarda en `materia_prima_items.precio_unitario` (por unidad de medida, 4 decimales) y `alicuota_iva`. Factura A sin precio: aviso amarillo que no frena.
- Stock: "Costos" pasó a "Precios de compra" con `precios_compra()`: Insumo | Precio unitario | IVA % | Precio final, el bulto con IVA, de dónde salió (compra/manual, proveedor, comprobante, fecha) y el historial; la carga a mano manda `p_alicuota_iva`.
- Carga: un cliente del grupo dice "Orden interna" y el código N-I-…; Administración: el sello "Orden interna" y la lista ordenada por fecha y código.
- Arreglo de paso: en Ingreso de MP, `textoResultadoVivo`, `textoBultoIncompleto` y `resultadoNoCierra` vivían ADENTRO de `htmlItemAbierto` (desde 01/09): tipear una cantidad en bultos tiraba ReferenceError y no refrescaba la diferencia. Ahora están afuera (lo controla test-materia-prima-precios).

## Decidido sin consultar
- El índice único de la base es solo por `codigo` (el pedido decía fábrica + código); la pantalla no depende de eso. **Para el chat de la base.**
- La variación de costo (`htmlVariacion`) se sacó de la lista: la lista ahora dice el último precio, no el costo vigente.
- `stock_valorizado` queda como estaba (sigue con los costos).
- Las suites de Ingreso de MP toman las funciones del precio de `pruebas/precio-mp-comun.js` (una función nueva del precio se suma ahí y la ven todas).
- Ensayo: el navegador dio verde (698); las suites se cortaron a los 20 min porque `npm run pruebas` ya tarda ~20-23 min solo en esta compu. Se integró con `npm run pruebas` 306/306 sobre el MISMO árbol y GitHub en verde en la rama. Main se movió en el medio (detalle-factura-compra, solo Gastos): se trajo a la rama y se volvió a probar todo.

## No probado
- Un ingreso real con precio contra la base, y `valorizar_orden_retiro` de una orden interna real (la base es de solo lectura para Claude Code).
- La foto de una factura real por el OCR con precio por bulto.

## Qué automatizaría ahora
- **El tope del ensayo según la duración real de la suite**: `npm run pruebas` ya pasa los 20 min; el ensayo debería tomar el tope del último `npm run pruebas` verde (+50 %) en lugar de un número fijo, o correr las suites en paralelo.
- **Un control de "función anidada sin querer"**: escanear los módulos buscando `function x(` declaradas adentro de otra función y usadas afuera (el bug de `textoResultadoVivo` vivió dos meses).
- **Las listas de funciones de los sandboxes**: que `construirCon` sume solo la clausura de las funciones pedidas (como ya hacen test-stock-costos y test-materia-prima-xss), así una función nueva no rompe cinco suites.
