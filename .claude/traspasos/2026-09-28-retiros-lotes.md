# Retiros y clientes, después de probarlos (28/09/2026)

Tag de antes: `antes-de-retiros-lotes-2026-09-28`. Supabase en **solo lectura**: cero SQL escrito. La base ya traía los cambios (chat de arquitectura); se verificaron con `pg_get_functiondef` y `pg_constraint` antes de usarlos.

## Qué se hizo

| Parte | Commit | Actions |
|---|---|---|
| 1. Carga: tres grupos, varios lotes, faltante que no bloquea | `267928e` | Pruebas y Navegador en verde |
| 2. Administración: "Retiros por revisar" | `c64f3f8` | Pruebas [36471939057](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36471939057) y Navegador [36471939170](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36471939170) en verde |
| 3. Clientes: interruptor, "Mostrar apagados", código anterior | `d65d896` | ver el cierre |

1. **Cargar una orden** (`modulos/retiros.html`): lo que se ofrece va en tres grupos con encabezado y color — "Producto terminado · SIN CONO" (grafito), "· CON CONO" (amarillo, con el cono de cada uno y su stock) y "Materia prima e insumos" (marrón). Cada opción dice cuánto hay. Sin buscar, solo lo que tiene stock; al buscar, también lo que no, marcado "sin stock" en bordó.
2. **Varios lotes por renglón**: elegido algo, sus lotes en lista (los más viejos primero, con lo que queda) y un campo por lote. "Completar con los más viejos" reparte (42 = 15 + 10 + 17). Siempre: pedido, asignado y cuánto falta asignar. El renglón viaja con `lotes`.
3. **Faltantes**: se puede confirmar igual, con el aviso en bordó "Esto no está en stock: la orden sale igual y queda pendiente de revisión en Administración".
4. **Administración → Retiros por revisar** (`retiros:precios`), con su número en la portada: cada renglón pendiente con la orden (código), el cliente, qué se llevó y cuánto faltaba; "Aceptar" pide el motivo y llama a `resolver_faltante_retiro`.
5. **Clientes**: un interruptor por cliente (apagar / prender) con `guardar_cliente(p_activo)`; "Mostrar apagados" en la lista, con su cuenta corriente; el código anterior en la fila, la cuenta y la ficha.

## Decisiones

- **La cantidad del renglón es la SUMA de los lotes** (así lo hace la base). Por eso, si lo repartido no llega a lo pedido y **ya no hay lugar en ningún lote**, el resto viaja en el lote `'SIN STOCK'` (faltante). Si todavía hay lugar en algún lote, **bloquea** ("faltan asignar N: tocá «Completar con los más viejos»") en vez de adivinar de dónde sale. Asignar de más que lo pedido también bloquea. Pedir de más en UN lote no bloquea: es un faltante y se avisa.
- **Sin repartir, no viaja `lotes`**: la base descuenta sola de los más viejos (como antes). El aviso de faltante igual se calcula contra el stock de los lotes.
- **El stock por cono** se lee de `stock_terminado_movimientos` (los cuatro del depósito tienen `stock:ver`, medido el 28/09/2026). Sin permiso o si falla → una opción por presentación "entre todos los conos" y el cono se elige después. Nunca un número de menos.
- **El stock SIN LOTE de un insumo** (cajas, bolsas) ahora se ofrece como "Sin lote" (lote `''`, que la base toma como el lote null). Antes se descartaba y parecía que no había stock.
- **Los apagados**: `clientes_con_saldo()` solo trae activos (hueco), así que se leen de la tabla y su saldo se suma en la pantalla; "—" si falla o llega a 1000 movimientos.
- **El interruptor lee la fila ENTERA antes de guardar**: `guardar_cliente` pisa nombre, apodos, localidad, teléfono y observaciones con lo que recibe. Sin eso, apagar a un cliente le borraba los apodos.
- Colores de los grupos: grafito / amarillo / marrón. Si preferís otros, es un cambio de CSS (`.rt-grupo--*`, `.rt-opcion--*`).

## Huecos de base (para el chat de arquitectura)

1. `clientes_con_saldo()` → sumar `p_incluir_apagados` (hoy la pantalla suma el saldo de los apagados).
2. `catalogo_para_retiro()` → devolver el stock de cada presentación con cono **por cono** (hoy se lee de `stock_terminado_movimientos`, que pide `stock:ver` o Producción).
3. `retiros_por_revisar()` no dice de qué lote(s) salió el faltante; la tarjeta no lo muestra.

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: ninguna RPC se ejecutó (solo lectura). Todo contra dobles y en la maqueta (sin sesión), a 390 y 1280 px, sin scroll horizontal ni errores.
- No se probó en el celular del depósito: que la lista de lotes con los campos sea cómoda con los dedos.
- No se probó `resolver_faltante_retiro` de verdad (que el ajuste deje el lote en cero).

## Guion para Facu

1. Celular, **Órdenes de retiro**: al cargar un renglón, ver los tres grupos con su color. En CON CONO, que cada cono diga su stock (ej. "Mini con cono · LOLO · hay 12 cajas").
2. Escribir en el buscador un producto sin stock: tiene que aparecer marcado "sin stock" en bordó.
3. Elegir un Mini sin cono, poner 42 cajas, tocar **"Completar con los más viejos"**: ver 15 + 10 + 17 (o lo que haya) y "asignado todo".
4. Borrar lo de un lote: tiene que decir "falta asignar" y no dejar revisar hasta completar.
5. Pedir más de lo que hay y "Completar": ver el aviso en bordó "Esto no está en stock… queda pendiente de revisión en Administración". Confirmar: la orden sale.
6. **Administración**: en la portada, "Retiros por revisar" con el número. Entrar, tocar **Aceptar**, escribir "se compró y no se cargó el ingreso" y aceptar: el renglón sale de la lista. En Stock / Producción, el lote tiene que quedar en cero.
7. **Administración → Clientes**: apagar un cliente con el interruptor; que diga que ya no aparece. Tildar **"Mostrar apagados"**: aparece al final, marcado, con su saldo. Abrir su cuenta: dice "Cliente apagado". Volver a prenderlo.
8. Con el cliente apagado, intentar elegirlo en Órdenes de retiro, en Pedidos y al asentar una cobranza: no tiene que aparecer.
9. En la ficha de un cliente: "Código en el sistema anterior: N".

## Qué automatizaría ahora

**Los dobles de prueba que comparten objetos entre casos.** En esta tanda, el interruptor mutaba la fila que el doble de `supabase` devolvía por referencia, y el caso siguiente leía el cliente ya apagado: seis fallas que parecían bugs del código. Lo mismo puede pasar en cualquier suite que devuelva desde `__tablas` el mismo array. La salida: que el doble de los sandboxes (`sandbox-*.js`) devuelva **siempre una copia** (`structuredClone`) de lo que hay en `__tablas`, en un solo lugar (un helper en `pruebas/sandbox.js` que usen todos los `from()`), con una prueba que muta lo devuelto y verifica que la tabla no cambió. Así ningún caso contamina al siguiente sin que la suite tenga que acordarse.

Segunda: **los importes llevan espacio duro** (`$ 749,50`) y una regex con espacio común da un rojo confuso. Un helper `importeRe('749,50')` en `circuito-comun.js` lo evitaría.
