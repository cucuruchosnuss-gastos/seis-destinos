# Traspaso — 21/10/2026: dividir una orden para facturar (condición de venta y facturas de ARCA)

Rama `ci-prueba/division-orden-facturar` (desde `origin/main` 2bc7d23). **Sin integrar**: la audita el chat de la base.
Pedido: `.claude/pedidos/2026-10-21-division-orden.md`. Documentación: `docs/memoria/administracion.md` (entrada nueva arriba de todo, "DIVIDIR PARA FACTURAR").

## Qué se hizo
1. **Ficha del cliente** (Administración → Clientes → Ficha): bloque "Condición de venta" con Parte A %, Parte B % (escribir uno completa el otro hasta 100; vacío = no se divide) y Comisión parte A % (21 por defecto). Botón propio "Guardar la condición de venta" → `guardar_condicion_venta_cliente`.
2. **Orden valorizada**: bloque "Facturas de ARCA" (cómo se factura y los números ya cargados) y botón "Dividir para facturar" (con `retiros:precios` en la empresa de la orden). La ventana trae los % de `datos_division_orden`, la vista previa se pide 400 ms después de escribir (sin guardar), y "Guardar e imprimir" llama a `guardar_division_orden` y después imprime la hoja A4 (bloques -A y -B, comisión debajo de la tabla, renglones en 0 afuera, pie con el total de la orden).
3. **Facturas de ARCA**: en la ventana, A y B (o "Factura única" si no se divide), número para pegar (3 a 40) y PDF opcional → `guardar_factura_orden`. El número sale al lado de "<codigo>-A/-B" en la ventana, en la orden y en la hoja.

## Decisiones tomadas sin consultar
- **La ruta del PDF lleva `<uid>/` adelante**: `<uid>/facturas-venta/<unidad_negocio_id>/<año>/<codigo>-<parte>.pdf`. La policy de Storage del bucket `comprobantes` (leída el 21/10/2026) solo deja SUBIR dentro de la carpeta del usuario; con la ruta pedida tal cual, toda subida fallaba. `<empresa>` es el id de la unidad y `<año>` el de la fecha de la orden.
- **El PDF solo lo puede abrir quien lo subió**: la policy de LECTURA de `comprobantes` deja ver la carpeta propia (o las de `mp` y gastos). A otra persona "Ver el PDF" le dice "No se pudo abrir el PDF con tu usuario." → **para el chat de la base**: una policy de SELECT para `*/facturas-venta/<unidad>/…` con `retiros:precios` o `retiros:ver` en esa unidad.
- Un PDF que ya existe con ese nombre (se cambió la factura) se sube con la hora al lado (Storage no deja pisar sin policy de UPDATE).
- La condición de venta se guarda con su propio botón, no con "Guardar la ficha" (como apodos y la clasificación).
- Una factura única ya cargada no se esconde si después la orden se divide (se ve junto a A y B).
- Una parte sin renglones (p. ej. 100 % / 0 %) igual se imprime, con "Sin productos en esta parte.".
- Sin condición de venta, la ventana muestra el error de la base tal cual, los % vacíos y la comisión del cliente (o 21); mientras tanto se puede cargar la factura única.
- Los % se validan antes de mandar con los MISMOS textos de la base ("El % de la parte A va de 0 a 100.", "La comisión va de 0 a 100.", "Pegá el número de la factura de ARCA.").

## Lo que no se pudo probar
- **Contra la base real**: todo se probó con la maqueta y el sandbox (Claude Code no escribe en la base). En particular, que la subida a Storage pase con la ruta `<uid>/facturas-venta/…`: se dedujo de la policy, no se subió un archivo real.
- La impresión real (el diálogo del navegador): se probó la hoja con `emulateMedia('print')`, no en papel.

## Guion para Facu (2 minutos)
1. Administración → Clientes → un cliente → Ficha → "Condición de venta": poné 30 en Parte A (B dice 70) → "Guardar la condición de venta".
2. Órdenes → una orden valorizada de ese cliente → "Dividir para facturar": cambiá A a 40 y mirá cómo cambian los montos; "Guardar e imprimir".
3. En la misma ventana, pegá un número en "N° de factura ARCA" de la A → "Guardar la factura": aparece en la orden.

## Resultado de las pruebas
- `npm run pruebas` 269/269 en verde (incluye check-bytes); `node pruebas/check-scripts.js` OK.
- `test-administracion-division-orden.js` 159/159; `mut-administracion-division-orden.js` 66/66 (+19 equivalentes).
- `e2e/53-division-orden.spec.js` 12/12 (390, 360, 768 y 1280 px).

## Qué automatizaría ahora
- **El arnés de las suites termina en verde si una promesa queda colgada**: si una rama async nunca resuelve, node sale con código 0 sin imprimir el resultado, y el runner de mutaciones lo cuenta como "escapó" (o peor, una suite podría pasar sin afirmar). Pasó acá con las pruebas de doble toque. Arreglo barato: en `arnes()` de `pruebas/circuito-comun.js`, un `process.on('beforeExit')` que, si `fin()` no cerró, imprima "ROJO: quedaron ramas sin terminar" y salga con 1.
- **Leer las policies de Storage antes de codificar una ruta**: un `pruebas/test-rutas-storage.js` que tome cada `storage.from('<bucket>').upload(<ruta>)` de los módulos y verifique contra un snapshot de `pg_policies` de `storage.objects` que el primer tramo sea el uid cuando el bucket lo exige.
