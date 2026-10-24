# Traspaso — Los insumos por bulto (23/10/2026)

Rama `ci-prueba/unidades-por-bulto` (desde `origin/main` df19453). **No se integra**: queda pusheada para auditoría.

## Qué se hizo

El pedido de Facu: la base ya dice cómo se muestra cada insumo (`insumos.vista_preferida`: 'bulto' para harina, azúcar, óleo, sal; 'base' para lecitina, colorante, etc.). Ahora TODA pantalla que muestra o pide cantidades o precios de insumos lo respeta: con 'bulto' y un contenido conocido, se escribe y se ve POR BULTO, y a la base va SIEMPRE la unidad base. Cero cambios en RPCs o en la base.

- **La regla, una sola vez, en `js/cantidades.js`** (la octava excepción, que ya existía; se le sumó "la tercera parte"): `contenidoUnico`, `modoDePrecio`, `precioABase`, `precioDesdeBase`, `DECIMALES_PRECIO_BASE`. La parte de las cantidades (`modoDeCarga`, `aUnidadBase`, `cantidadSegunVista`) ya existía y se reusó.
- **`js/retiros-comun.js`** (la hoja de las órdenes): `modoPrecioHoja`, `cantidadInsumoBultoHoja`, `precioInsumoHoja`.

### Pantallas tocadas (archivo · qué muestra/pide · cómo quedó)

| Archivo | Qué muestra / pide | Cómo quedó |
|---|---|---|
| `modulos/administracion.html` | Detalle de una orden de retiro (renglón de insumo valorizado) | "4 bultos de 25 kg · Harina 000 · Júpiter", debajo chico "= 100 kg"; "$ 17.500,00 x bulto de 25 kg" y chico "$ 700,00 por kg". Lecitina sigue "x kg". |
| `modulos/administracion.html` | Valorizar / Corregir valorización (PIDE el precio) | El campo dice "Precio x bulto de 25 kg" y trae el precio de la lista (o el guardado) pasado a bulto; lo escrito viaja a `valorizar_orden_retiro` por kg (18.000 la bolsa → 720). Debajo, chico, el precio por kg que se manda. |
| `modulos/administracion.html` + `js/retiros-comun.js` | La hoja con precios (imprimir, PDF, texto para compartir) | "4 bultos de 25 kg (100 kg)" y "$ 17.500,00 / bulto". |
| `modulos/administracion.html` | Listas de precios → tarjeta "Insumos: precio fijo o costo + %" (muestra y PIDE) | "Precio fijo $ 17.500,00 el bulto de 25 kg ($ 700,00 por kg)"; el editor pide "Precio por bulto de 25 kg" y guarda `p_precio_unitario` por kg; costo + % también se dice por bulto. |
| `modulos/administracion.html` | Listas de precios → grilla (muestra vigente, próximo, historial; PIDE precio nuevo; "Aumentar todo") | Fila "Júpiter · por bulto de 25 kg", vigente "$ 17.500,00 el bulto de 25 kg", el precio nuevo se escribe por bulto y se guarda por kg; "Aumentar todo" sube el bulto. |
| `modulos/retiros.html` | La Carga: catálogo ("hay …"), "¿Cuánto se lleva?", lotes ("quedan", campo por lote), resumen de lotes, tarjeta, resumen, "Agregar · …" | "¿Cuánto se lleva? (bultos de 25 kg)", debajo "= 100 kg", −/+ de a un bulto, lotes en bultos, "quedan 16 bultos (400 kg)", "Agregar · 4 bultos (100 kg)". El renglón guarda y manda kilos. |
| `modulos/retiros.html` + `js/retiros-comun.js` | La hoja sin precios y Mis retiros | "4 bultos de 25 kg (100 kg)". |
| `modulos/stock.html` | Stock → Costos: la fila, el costo actual, el historial y "¿Anular…?" | "$ 27.500,00 el bulto de 25 kg · $ 1.100,00 por kg". (El campo para CARGAR el costo ya pedía por bulto desde el 09/10.) La tarjeta de stock ya respetaba la vista desde el 02/10. |

**No cambiaron (decidido):** el Excel de precios (importar/exportar sigue por kg: cambiarlo cambiaría el significado de las planillas que ya tiene Facu), la hoja de la división para facturar (`datos_division_orden` no trae el insumo ni su contenido; es para ARCA), "Valorizar mercadería e insumos" de Entre empresas (solo muestra totales), y la vista de producto terminado de Stock / las devoluciones (las tocan otras ramas de la tanda).

## El redondeo (el pedido decía "probalo")

`orden_retiro_items.precio_caja` y `lista_precios_items.precio_caja` guardan 2 decimales; `lista_precios_items.precio_unitario`, 4. $ 17.500 la bolsa de 30 kg son 583,333… el kilo: guardado con 2 decimales vuelve 17.499,90. Por eso:
- se manda el cociente con 8 decimales: `valorizar_orden_retiro` calcula el subtotal con el precio que RECIBE (`round(v_precio * v_cant, 2)`, leído con `pg_get_functiondef`), así el subtotal da exacto;
- para volver a mostrar, `precioDesdeBase` busca el precio por bulto (en centavos) que redondeado como la base da lo guardado y además da el subtotal guardado; entre varios, el más redondo; si ninguno cierra, multiplica.
- Probado en `test-cantidades-precios.js`: 70 combinaciones de precio × contenido (25, 50, 20, 30, 12,5, 3, 1 kg) ida y vuelta, guardado con 4 decimales (70), con 2 decimales + subtotal para 1, 2, 4 y 10 bultos (280) y el subtotal de la base (280): todo vuelve exacto.

## Lo decidido sin consultar

1. Se dice "bulto" y no "bolsa": si es bolsa, balde o bidón no está guardado (la misma regla que ya usa Stock).
2. Lo que trae un bulto sale de `v_stock_insumos.contenido_unico` de la empresa (lo que ya usa Stock); en una orden mandan los `contenido_por_bulto` de sus movimientos de despacho (si los lotes tienen dos presentaciones, el renglón va por kg).
3. Esa vista pide `stock:ver` en la empresa. **Quien no lo tenga (p. ej. una cuenta de la Carga solo con `retiros:cargar`) sigue viendo kilos**, sin errores. Un insumo sin stock en esa empresa tampoco tiene contenido (no aparece en la vista) → kilos.
4. En la Carga, una parte suelta del stock no impide pedir en bultos (el bulto es solo la unidad del campo; el renglón guarda kilos). Igual que la tarjeta de Stock, que ignora los sueltos para decir el contenido.
5. La grilla de la lista guarda por `guardar_precios` en `precio_caja` (2 decimales): un precio por bulto con centavos que no se dividen justo (17.500,01 / 25) puede quedar un centavo distinto en la base. La tarjeta de insumos guarda con 4 decimales y no tiene ese problema. Se deja anotado; no se tocó la base.

## Lo verificado en la base (SELECT de solo lectura, 23/10/2026 ~12:05 de Argentina)

- `insumos.vista_preferida`: text NOT NULL default 'base'; CHECK `chk_vista_preferida`: `vista_preferida = ANY (ARRAY['base','bulto'])`.
- 'bulto': Harina 000 (Wali, Júpiter, Chacabuco, La Clásica), Azúcar, Sal, Óleo margarina (Ultra, Cordobesa), Aceite alta temperatura, Alcohol, Desmoldante, Jabón, Profoam, Toalla intercaladas. 'base': Lecitina de soja (entre otros).
- Escalas: `orden_retiro_items.precio_caja/subtotal` numeric(14,2), `cantidad` (14,3); `lista_precios_items.precio_caja` (14,2), `precio_unitario` (14,4); `insumo_costos.costo_unitario` numeric sin escala.
- `pg_get_functiondef`: `valorizar_orden_retiro`, `guardar_precio_insumo_lista`, `guardar_precios`, `precio_vigente_insumo`, `precios_insumos_lista`, `lotes_insumo_para_retiro` (no trae contenido), `mis_ordenes_retiro` (trae `insumo_id`), `datos_division_orden`.
- `pg_get_viewdef`: `v_stock_insumos` (`contenido_unico` = el único `contenido_por_bulto` distinto; security_invoker) y `v_stock_por_lote`. Policy de `stock_movimientos`: `tiene_tarea_alcance('stock','ver', unidad)`.

## Pruebas

- `test-cantidades-precios.js` (36) + `mut-cantidades-precios.js` (18/18: js/cantidades.js y Stock).
- `test-administracion-insumos-bulto.js` (49) + `mut-administracion-insumos-bulto.js` (27/27: administracion.html y retiros-comun.js).
- `test-retiros-insumos-bulto.js` (35) + `mut-retiros-insumos-bulto.js` (16/16).
- `test-stock-costos.js` sumó 2 (92).
- `e2e/54-insumos-por-bulto.spec.js` (desde el 24/10, `e2e/57-insumos-por-bulto.spec.js`): Carga, Administración y Stock → Costos a 390, 360, 768×1024 y 1280 px (12/12), sin scroll horizontal ni errores.
- Escape de lo nuevo: `test-administracion-ordenes.js` (165) y `test-retiros-carga.js` (263) suman la unidad del catálogo marcada en el precio por kg chico y en el "= N kg" (las mutaciones automáticas de esos `esc()` escapaban: la unidad de un insumo que no se reconoce se muestra tal cual). Mutaciones existentes re-corridas de a una: administracion-costos 33/33, -ordenes 82/82, -listas 36/36, -lista-completa 41/41, -lista-interna 10/10, -importar 48/48, retiros-carga 118/118, -hoja 77/77, -lotes 82/82, -mis 24/24, -origen 63/63, -cliente-nuevo 40/40, -barra-unidad 5/5, cantidades 30/30, cantidades-escribir 26/26.
- Navegador relacionado (puertos 4240/4241): 4-retiros, 5-maqueta, 13 y 15 (comparar), 25-cantidades, 28-hoja-retiro, 29-costos-insumos, 30-revision-celular, 34-faltante-retiro, 40-cuenta-a-orden, 50-origen, 53-division-orden y 54: 133 pasaron, 2 salteados.
- Ajustados a propósito (el texto cambió): `test-retiros-lotes.js` (una regex), `e2e/29-costos-insumos.spec.js` (la confirmación de Anular ahora dice el bulto), anclas de `mut-administracion-costos/listas`, `mut-retiros-carga/hoja/lotes`; los sandboxes de Administración y Retiros suman las funciones nuevas.

## Lo que no se pudo probar

- Nada con sesión real ni contra la base (cero escrituras).
- Con una cuenta real sin `stock:ver` (se espera kilos, probado en la suite con la tarea quitada).

## Guion para Facu

1. Administración → Órdenes → una orden con harina: debería decir "N bultos de 25 kg" y el precio por bolsa.
2. "Corregir valorización": el campo de la harina pide el precio de la bolsa. Escribí 17.500 y guardá: el total tiene que ser 17.500 × bolsas.
3. Listas de precios → "Insumos": la harina dice el precio de la bolsa; "Cambiar" pide por bolsa.
4. Órdenes de retiro (la Carga): elegí harina; tiene que decir "bultos de 25 kg" y "= 100 kg" al poner 4.
5. Lecitina en cualquiera de esas pantallas: sigue en kg.

## 24/10/2026 — el cambio que pidió el chat de la base (al aprobarla)

- **Merge de `origin/main` (3fd2abe)**: un solo choque, en `docs/memoria/stock.md` (la entrada del costo por bulto de esta rama contra la de los lotes sin ingreso de `tablet-lote-y-caja`): quedaron las dos.
- **El contenido del bulto sale PRIMERO de `insumos.contenido_bulto`.** Administración (`leerCatalogo` + `contenidoDelCatalogo`, y `modoPrecioInsumo`: el catálogo le gana a los lotes del renglón) y la Carga (`leerCatalogo` + `conBultosDeInsumos`). Solo si la columna es null se usa lo de antes (`v_stock_insumos`, con `stock:ver`; en una orden, los `contenido_por_bulto` de sus lotes). Así Yanina (`retiros:precios` sin `stock:ver`) valoriza la harina por bolsa: $ 17.500 → manda 700 el kg.
- **Verificado en la base (SELECT, 24/10/2026 10:22 de Argentina):** `insumos.contenido_bulto` numeric sin escala, NULL permitido, sin default; CHECK `contenido_bulto IS NULL OR contenido_bulto > 0`; policies de `insumos`: SELECT "leer catalogo de insumos" `auth.uid() IS NOT NULL` (más un INSERT "crear insumo desde carga"); grant SELECT a `authenticated`. Valores: Harina 000 (Wali, Júpiter, Chacabuco, La Clásica) 25, Azúcar 50, Óleo margarina (Ultra, Cordobesa) 20, Colorante Nico 25 (vista 'bulto'), Desmoldante y Profoam 5, Toalla intercaladas 2,9, Lecitina 215 / Gelatina 25 / Film 20,8 (vista 'base': siguen en su unidad), Sal, Aceite alta temperatura, Alcohol y Jabón: null (vista 'bulto': por su unidad salvo que el stock lo diga).
- **Renumerado** `e2e/54-insumos-por-bulto.spec.js` → `e2e/57-insumos-por-bulto.spec.js` (el 54 lo usan conos-parecidos, hoja-sin-cortes, devoluciones-retiro y esqueleto-parejo; el 53 stock-terminado; el 56 tablet-lote-y-caja).
- **Pruebas nuevas:** `test-administracion-insumos-bulto.js` 49 → 63 (Yanina sin `stock:ver`: harina por bolsa 17.500 → 700, colorante Nico por bidón de 25 kg, lecitina 'base' por kg aunque el catálogo diga 215, sal sin contenido por kg; con `stock:ver`, el catálogo 25 le gana al stock 50 y a lotes de 50, y un null sale del stock); `mut-administracion-insumos-bulto.js` 27 → 33/33 (sacar la lectura de `contenido_bulto`, que `contenidoDelCatalogo` devuelva null, que el stock o los lotes le ganen al catálogo, que un null no use el stock); `test-retiros-insumos-bulto.js` 35 → 42 y `mut-` 16 → 20/20; `e2e/57`: 12 → 20 (sumó "la Carga sin stock:ver pide el colorante Nico en bidones de 25 kg" y "Administración sin stock:ver valoriza la harina por bolsa ($ 17.500 → 700)", a 390, 360, 768×1024 y 1280). Las dos e2e nuevas dan rojo si se saca la lectura del catálogo (probado a mano). Ancla ajustada: `mut-retiros-lotes.js` (el SELECT de insumos sumó `contenido_bulto`), 82/82.
- **Colorante Nico en los datos de prueba:** está en las suites y en la e2e (por `maqueta.cambios`, sin tocar los datos compartidos de la maqueta, que usan otras pruebas).

### Lo decidido sin consultar (24/10)

1. **Stock → Costos sigue con `v_stock_insumos`** para lo que trae un bulto (el campo "Precio por bulto" y lo que se muestra): quien entra ahí ya tiene `stock:ver`, el catálogo de Stock (`estado.insumos`) no siempre está cargado en esa pantalla y la rama `stock-terminado-prolijo` toca `stock.html`. Si se quiere que también mande el catálogo, es sumar `contenido_bulto` a `cargarInsumos`/`asegurarCatalogo` y mirarlo primero en `presentacionCosto`.
2. Con contenido en el catálogo, **los lotes del renglón ya no mandan** en una orden (antes, lotes de 50 kg hacían decir "bultos de 50 kg" aunque el insumo fuera de 25). Es lo que pide "sale PRIMERO de la columna nueva".
3. La consulta a `v_stock_insumos` se sigue haciendo (con `stock:ver`) aunque todos los insumos tengan `contenido_bulto`: es una sola lectura y cubre los null.

## Qué automatizaría ahora

**Las anclas rotas de las mutaciones.** Cada cambio de texto en un módulo rompe anclas de `mut-*.js` ajenos y recién se ve corriendo esas mutaciones una por una (acá fueron cinco archivos y una corrida de 15 minutos para encontrarlos). Un `pruebas/anclas-rotas.js` que lea todos los `mut-*.js`, junte los `de:` y las `expr:` de equivalentes y avise cuáles ya no existen en el archivo que mutan —en segundos, sin correr nada— y que corra dentro de `npm run pruebas:rama`. Lo segundo más caro: las listas a mano de `FUNCIONES_BASE` de los sandboxes; la clausura automática que ya usan las suites de Stock (seguir los identificadores desde las funciones raíz) sacaría ese paso.
