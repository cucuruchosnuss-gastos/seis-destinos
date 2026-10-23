# Traspaso — 21/10/2026: dividir una orden para facturar (condición de venta, 3 vendedores y facturas de ARCA)

Rama `ci-prueba/division-orden-facturar` (desde `origin/main` 2bc7d23; con `main` f32b687 —el arnés— traído por merge). **Sin integrar**: la audita el chat de la base.
Pedidos: `.claude/pedidos/2026-10-21-division-orden.md` (el primero y el segundo, de la noche). Documentación: `docs/memoria/administracion.md` (entrada de arriba de todo, "DIVIDIR PARA FACTURAR, LA CONDICIÓN DE VENTA Y LAS COMISIONES DE LOS 3 VENDEDORES").

## Qué se hizo
1. **Configuración de comisiones** (sección nueva de Administración, con `retiros:precios`): los 3 vendedores en orden con su % y un "Guardar" cada uno (`guardar_comision_vendedor`); abajo el total, que cambia al tipear. Tarjeta en la portada con el total.
2. **Ficha del cliente → "Condición de venta"**: Parte A % / Parte B % (uno completa el otro; vacío = no se divide) y los 3 vendedores, cada uno "De la configuración" o "Propio de este cliente" con "Volver al de la configuración". Botón propio → `guardar_condicion_venta_cliente(p_comisiones)`: el % de los propios y null los de la configuración.
3. **Orden valorizada → "Dividir para facturar"**: la ventana trae A, B y los 3 vendedores de `datos_division_orden`; cualquier cambio (también uno puntual de un vendedor, solo para esa orden) pide la vista previa 400 ms después, sin guardar, con `p_comisiones` de los 3; "Guardar e imprimir" → `guardar_division_orden` y después la hoja A4.
4. **La hoja**: bloques -A y -B; en la A, debajo de la tabla, Total productos, una línea por vendedor, Total comisiones (con el % total) y TOTAL PARTE A; en la B, TOTAL PARTE B.
5. **Facturas de ARCA**: A, B o única, con PDF opcional (`guardar_factura_orden`), visibles en la ventana, en la orden y en la hoja.

## Decisiones tomadas sin consultar
- **"Volver al de la configuración" y los cambios de % en la ficha se guardan con el botón "Guardar la condición de venta"** (como todo el bloque), no al tocarlos.
- **Cambiar un % de vendedor en la ficha lo deja propio aunque el número quede igual al de la configuración** ("si se cambia, queda propio"). Un propio que se vacía vuelve a la configuración.
- En la ventana, sin condición de venta (la base no devuelve datos), los vendedores se llenan con el propio del cliente o el de la configuración (se lee `vendedores_comision` y `cliente_comisiones`), que es lo que la base usaría.
- En la ventana un % de vendedor vacío no se acepta ("Las comisiones van de 0 a 100.", el texto de la base); en la ficha sí (vuelve a la configuración).
- La sección de configuración se ve con `retiros:precios` en CUALQUIER empresa, porque `guardar_comision_vendedor` usa `tiene_tarea` sin alcance. La pestaña se llama "Comisiones" y va al final.
- La ruta del PDF sigue con `<uid>/` adelante (la policy de SUBIDA lo exige); la de LECTURA nueva ya deja abrirlo a quien tenga `retiros:precios/ver` en la empresa: se sacó el aviso de la documentación.
- Lo del primer pedido sigue igual: una factura única cargada no se esconde al dividir; una parte sin renglones dice "Sin productos en esta parte."; un PDF repetido va con la hora al lado.

## Lo que no se pudo probar
- **Contra la base real**: todo con la maqueta y el sandbox (Claude Code no escribe en la base). En particular, una subida real a Storage y abrir el PDF con otro usuario.
- La impresión en papel: la hoja se probó con `emulateMedia('print')`.

## Guion para Facu (3 minutos)
1. Administración → pestaña **Comisiones**: cambiá el Vendedor 2 a 3,5 → "Guardar" (el total dice 9,5 %).
2. Clientes → un cliente → Ficha → "Condición de venta": poné 30 en Parte A (B dice 70); cambiá el Vendedor 1 a 2,5 (dice "Propio de este cliente") → "Guardar la condición de venta".
3. Órdenes → una orden valorizada de ese cliente → **Dividir para facturar**: cambiá A a 40 y el Vendedor 3 a 5 y mirá la hoja; "Guardar e imprimir".
4. En la misma ventana, pegá un número en "N° de factura ARCA" de la A → "Guardar la factura".

## Resultado de las pruebas
- `npm run pruebas` 270/270 en verde (incluye check-bytes); `node pruebas/check-scripts.js` OK.
- `test-administracion-division-orden.js` 210/210; `mut-administracion-division-orden.js` 96/96 (+25 equivalentes); `test-administracion-diseno.js` 46/46 (con la pestaña Comisiones).
- `e2e/53-division-orden.spec.js` 16/16 (dividir e imprimir, factura única, ficha y configuración, a 390, 360, 768 y 1280 px).

## Qué automatizaría ahora
- **Una prueba que compare las firmas de las RPC que usa cada pantalla con las de la base**: la base cambió la misma tarde (de `p_comision_pct` a `p_comisiones`) y la rama quedó llamando funciones que ya no existían, sin que nada lo avisara. Un script que tome cada `supabase.rpc('<nombre>', { … })` de `modulos/` y compare los nombres de los parámetros con un snapshot de `pg_get_function_identity_arguments` (que el chat de la base actualice al cambiar una función) daría rojo en `npm run pruebas` apenas una pantalla quede desfasada.
- Llevar la guarda de "suite colgada" a los arneses propios (`controles-*.js` y las suites que no usan `arnes()`), como quedó anotado en `2026-10-21-arnes-ramas-colgadas.md`.
